import { NextResponse } from 'next/server';
import { db, agents } from '@/drizzle';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const { email } = await params;

    if (!email) {
      return NextResponse.json({ error: 'Missing email parameter' }, { status: 400 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.email, email))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: agent.id,
      email: agent.email,
      name: agent.name,
      avatarId: agent.avatar_id,
      openclawUrl: agent.openclaw_url,
      gatewayToken: agent.gateway_token,
      agentType: agent.agent_type,
      config: agent.config,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    });
  } catch (error: any) {
    console.error('Error fetching agent:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
