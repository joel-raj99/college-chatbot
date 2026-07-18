import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

export async function POST(request) {
  try {
    const { message, leadId, history = [] } = await request.json();
    if (!message || message.trim() === '') {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const db = await readDB();
    const { settings, collegeInfo, keywords } = db;
    let botReply = "";
    let usedAI = false;

    // 1. Run AI Chatbot if enabled and API Key is present
    if (settings.mode === 'ai' && settings.apiKey && settings.apiKey.trim() !== '') {
      try {
        const apiKey = settings.apiKey.trim();
        const systemPrompt = `${settings.systemPrompt}

Here is the official college information for your reference:
COLLEGE NAME: ${collegeInfo.name}
TAGLINE: ${collegeInfo.tagline}
DESCRIPTION: ${collegeInfo.description}
LOCATION: ${collegeInfo.location}
EMAIL: ${collegeInfo.email}
PHONE: ${collegeInfo.phone}

AVAILABLE COURSES:
${collegeInfo.courses.map(c => `- ${c.name} (${c.duration}): Fees are ${c.fees}. Eligibility: ${c.eligibility}`).join('\n')}

CAMPUS FACILITIES:
${collegeInfo.facilities.map(f => `- ${f.name}: ${f.description}`).join('\n')}

ADMISSION PROCESS:
${collegeInfo.admissionProcess.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}

KEY ADMISSION DATES & DEADLINES:
${collegeInfo.dates.map(d => `- ${d.event}: ${d.date}`).join('\n')}

CUSTOM PRE-DEFINED FAQS (Fallback Keywords):
${keywords.map(kw => `- Topic "${kw.keyword}": ${kw.reply}`).join('\n')}
`;

        // Format history for Gemini
        // Gemini expects: { role: 'user' | 'model', parts: [{ text: string }] }
        const contents = [];
        
        // Add previous messages (limit to last 10 messages for context)
        const chatContext = history.slice(-10);
        for (const msg of chatContext) {
          contents.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
        
        // Add the current user message
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        // Call Google Gemini API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemPrompt }]
              },
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 800
              }
            })
          }
        );

        if (response.ok) {
          const resData = await response.json();
          if (resData.candidates && resData.candidates[0] && resData.candidates[0].content && resData.candidates[0].content.parts[0]) {
            botReply = resData.candidates[0].content.parts[0].text;
            usedAI = true;
          } else {
            console.error("Unexpected Gemini response structure:", resData);
          }
        } else {
          const errText = await response.text();
          console.error("Gemini API call failed status:", response.status, errText);
        }
      } catch (err) {
        console.error("Error calling Gemini API:", err);
      }
    }

    // 2. Keyword/Rule-Based Fallback (if AI mode is off, API Key fails, or is missing)
    if (!usedAI) {
      const cleanMsg = message.toLowerCase().trim();
      
      // Look for custom keywords in database
      let bestMatch = null;
      for (const kw of keywords) {
        if (cleanMsg.includes(kw.keyword.toLowerCase())) {
          bestMatch = kw;
          break;
        }
      }

      if (bestMatch) {
        botReply = bestMatch.reply;
      } else {
        // Simple NLP Fallback checking general categories
        if (cleanMsg.includes("course") || cleanMsg.includes("program") || cleanMsg.includes("degrees") || cleanMsg.includes("study")) {
          botReply = `We offer several high-quality undergraduate and graduate programs at ${collegeInfo.name}: \n\n` + 
            collegeInfo.courses.map(c => `• **${c.name}** (${c.duration}) - Fees: ${c.fees}`).join('\n') + 
            `\n\nWhich program would you like to know more about?`;
        } else if (cleanMsg.includes("date") || cleanMsg.includes("deadline") || cleanMsg.includes("schedule") || cleanMsg.includes("apply when")) {
          botReply = `Here are the important dates for our admission cycle: \n\n` +
            collegeInfo.dates.map(d => `• **${d.event}**: ${d.date}`).join('\n') +
            `\n\nMake sure to complete your application before the deadlines!`;
        } else if (cleanMsg.includes("facility") || cleanMsg.includes("campus") || cleanMsg.includes("lab") || cleanMsg.includes("library") || cleanMsg.includes("sports")) {
          botReply = `Our campus is equipped with premium facilities: \n\n` +
            collegeInfo.facilities.map(f => `• **${f.name}**: ${f.description}`).join('\n') +
            `\n\nWould you like information on on-campus hostel housing?`;
        } else if (cleanMsg.includes("process") || cleanMsg.includes("apply") || cleanMsg.includes("admission") || cleanMsg.includes("how to")) {
          botReply = `Our admission process is straightforward: \n\n` +
            collegeInfo.admissionProcess.map(step => `• ${step}`).join('\n') +
            `\n\nYou can start by entering your contact details in our chatbot to open an enquiry!`;
        } else if (cleanMsg.includes("contact") || cleanMsg.includes("email") || cleanMsg.includes("phone") || cleanMsg.includes("address") || cleanMsg.includes("location")) {
          botReply = `You can reach the ${collegeInfo.name} admission office at:\n• **Email**: ${collegeInfo.email}\n• **Phone**: ${collegeInfo.phone}\n• **Campus Location**: ${collegeInfo.location}`;
        } else {
          // General welcome / help response
          botReply = `Hello! Thanks for your enquiry. I can help you with details about **${collegeInfo.name}**. \n\nYou can ask me about:\n• **Courses** we offer\n• Tuition **Fees** & **Scholarships**\n• On-campus **Hostel** facilities\n• **Placements** & recruiting partners\n• **Admission process** & key **Deadlines**\n\nWhat would you like to explore today?`;
        }
      }
    }

    // 3. Update Lead Chat History in DB if leadId exists
    if (leadId) {
      const leadIndex = db.leads.findIndex(l => l.id === leadId);
      if (leadIndex !== -1) {
        const lead = db.leads[leadIndex];
        const updatedHistory = [...(lead.chatHistory || [])];
        
        // Append user message if not already there, and bot reply
        updatedHistory.push({ sender: 'user', text: message });
        updatedHistory.push({ sender: 'bot', text: botReply });
        
        db.leads[leadIndex] = {
          ...lead,
          chatHistory: updatedHistory
        };
        await writeDB(db);
      }
    }

    return NextResponse.json({ reply: botReply, usedAI });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process chat: " + error.message }, { status: 500 });
  }
}
