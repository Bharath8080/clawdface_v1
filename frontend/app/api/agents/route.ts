import { NextResponse } from 'next/server';
import { db, agents, bots, profiles } from '@/drizzle';
import { eq } from 'drizzle-orm';

// Helper to generate unique timestamped emails
function generateAgentEmail(name: string): string {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const now = new Date();
  const timestamp = now.toISOString()
    .slice(0, 16) // YYYY-MM-DDTHH:mm
    .replace(/:/g, '')
    .replace('T', '-');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${cleanName}-${timestamp}-${randomSuffix}@clawdface.ai`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { name, avatarId, openclawUrl, gatewayToken, agentType, config, botId, userEmail } = body;

    // 1. Sanitize Inputs
    if (avatarId) avatarId = avatarId.replace(/^:/, '').trim();
    if (openclawUrl) openclawUrl = openclawUrl.trim();
    if (name) name = name.trim();
    if (gatewayToken) gatewayToken = gatewayToken.trim();

    if (!name || !avatarId || !openclawUrl || !gatewayToken) {
      return NextResponse.json(
        { error: 'Missing required fields: name, avatarId, openclawUrl, gatewayToken' },
        { status: 400 }
      );
    }

    const email = generateAgentEmail(name);
    let linkedBotId = botId;

    // 2. Optional: Link to User Library if userEmail is provided
    if (userEmail) {
      const [userProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, userEmail.trim()))
        .limit(1);

      if (userProfile) {
        // Automatically create a matching bot in the user's Library so it shows up in the UI
        const [newBot] = await db
          .insert(bots)
          .values({
            user_id: userProfile.id,
            name: name,
            avatar_id: avatarId,
            openclaw_url: openclawUrl,
            gateway_token: gatewayToken,
            session_key: `api-gen-${Date.now()}`,
          })
          .returning();
        
        linkedBotId = newBot.id;
      }
    }

    // 3. Create the Agent entry (for external Bridge API access)
    const [newAgent] = await db
      .insert(agents)
      .values({
        email,
        name,
        avatar_id: avatarId,
        openclaw_url: openclawUrl,
        gateway_token: gatewayToken,
        agent_type: agentType || 'openclaw',
        config: config || {},
        bot_id: linkedBotId || null,
      })
      .returning();

    return NextResponse.json(
      {
        id: newAgent.id,
        email: newAgent.email,
        name: newAgent.name,
        avatarId: newAgent.avatar_id,
        openclawUrl: newAgent.openclaw_url,
        gatewayToken: newAgent.gateway_token,
        agentType: newAgent.agent_type,
        config: newAgent.config,
        botId: newAgent.bot_id,
        created_at: newAgent.created_at,
        linkedToLibrary: !!linkedBotId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
