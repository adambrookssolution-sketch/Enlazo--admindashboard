import { useEffect, useState } from 'react';
import {
  MessageCircle,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  User,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card, Badge, Modal, Button, EmptyState, Avatar } from '../components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Conversation = {
  quote_id: string;
  messages: any[];
  client_profile: any;
  specialist_profile: any;
  specialist_data: any;
  quote: any;
  service_request: any;
  last_message_at: string;
  message_count: number;
};

type UserEntry = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: 'client' | 'specialist';
  conversations: Conversation[];
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  /* ---------- data loading ---------- */

  async function loadConversations() {
    try {
      setLoading(true);

      const { data: messages, error } = await (supabase as any)
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by quote_id
      const grouped: Record<string, any[]> = {};
      for (const msg of messages || []) {
        if (!grouped[msg.quote_id]) grouped[msg.quote_id] = [];
        grouped[msg.quote_id].push(msg);
      }

      const enriched: Conversation[] = await Promise.all(
        Object.entries(grouped).map(async ([quoteId, msgs]) => {
          const { data: quote } = await (supabase as any)
            .from('quotes')
            .select('*')
            .eq('id', quoteId)
            .single();

          let clientProfile: any = null;
          let specialistProfile: any = null;
          let specialistData: any = null;
          let serviceRequest: any = null;

          if (quote) {
            const { data: request } = await (supabase as any)
              .from('service_requests')
              .select('*')
              .eq('id', quote.request_id)
              .single();

            serviceRequest = request;

            if (request?.user_id) {
              const { data: client } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', request.user_id)
                .single();
              clientProfile = client;
            }

            const { data: specialist } = await (supabase as any)
              .from('specialist_profiles')
              .select('*')
              .eq('id', quote.specialist_id)
              .single();

            specialistData = specialist;

            if (specialist?.user_id) {
              const { data: specProfile } = await (supabase as any)
                .from('profiles')
                .select('*')
                .eq('id', specialist.user_id)
                .single();
              specialistProfile = specProfile;
            }
          }

          const sorted = [...msgs].sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );

          return {
            quote_id: quoteId,
            messages: sorted,
            client_profile: clientProfile,
            specialist_profile: specialistProfile,
            specialist_data: specialistData,
            quote,
            service_request: serviceRequest,
            last_message_at: msgs[0].created_at,
            message_count: msgs.length,
          };
        }),
      );

      enriched.sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
      );

      setConversations(enriched);
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMessage(messageId: string) {
    try {
      const { error } = await (supabase as any)
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
      loadConversations();

      if (selectedConversation) {
        setSelectedConversation({
          ...selectedConversation,
          messages: selectedConversation.messages.filter((m: any) => m.id !== messageId),
        });
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  }

  /* ---------- derived: build user list ---------- */

  function buildUserList(): UserEntry[] {
    const map: Record<string, UserEntry> = {};

    for (const conv of conversations) {
      // client
      if (conv.client_profile?.id) {
        const uid = conv.client_profile.id as string;
        if (!map[uid]) {
          const p = conv.client_profile;
          map[uid] = {
            id: uid,
            name: [p.first_name, p.last_name_paterno, p.last_name_materno].filter(Boolean).join(' ') || p.display_name || 'Cliente',
            avatar_url: p.avatar_url ?? null,
            role: 'client',
            conversations: [],
          };
        }
        map[uid].conversations.push(conv);
      }

      // specialist
      if (conv.specialist_profile?.id) {
        const uid = conv.specialist_profile.id as string;
        if (!map[uid]) {
          const p = conv.specialist_profile;
          map[uid] = {
            id: uid,
            name: [p.first_name, p.last_name_paterno, p.last_name_materno].filter(Boolean).join(' ') || p.display_name || 'Especialista',
            avatar_url: p.avatar_url ?? conv.specialist_data?.profile_photo_url ?? null,
            role: 'specialist',
            conversations: [],
          };
        }
        if (!map[uid].conversations.find((c) => c.quote_id === conv.quote_id)) {
          map[uid].conversations.push(conv);
        }
      }
    }

    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }

  const users = buildUserList();

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    return u.name.toLowerCase().includes(search.toLowerCase());
  });

  /* ---------- helpers ---------- */

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours}h`;
    if (diffDays < 7) return `hace ${diffDays}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  }

  function formatFullDate(dateString: string) {
    return new Date(dateString).toLocaleString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function otherPartyName(conv: Conversation, userId: string): string {
    if (conv.client_profile?.id === userId) {
      const p = conv.specialist_profile;
      return p ? [p.first_name, p.last_name_paterno].filter(Boolean).join(' ') : 'Especialista';
    }
    const p = conv.client_profile;
    return p ? [p.first_name, p.last_name_paterno].filter(Boolean).join(' ') : 'Cliente';
  }

  /* ---------- loading state ---------- */

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            border: '4px solid rgba(170,27,241,0.3)',
            borderTopColor: '#AA1BF1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ---------- render ---------- */

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              padding: '10px',
              backgroundColor: 'rgba(170,27,241,0.1)',
              borderRadius: '12px',
            }}
          >
            <MessageCircle style={{ width: '24px', height: '24px', color: '#AA1BF1' }} />
          </div>
          <div>
            <h2
              style={{
                fontFamily: "'Isidora Alt Bold', sans-serif",
                fontSize: '20px',
                color: '#36004E',
                margin: 0,
              }}
            >
              Conversaciones
            </h2>
            <p
              style={{
                fontFamily: "'Centrale Sans Rounded', sans-serif",
                fontSize: '14px',
                color: '#6B7280',
                margin: 0,
              }}
            >
              {conversations.length} conversaciones &middot; {users.length} usuarios
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative', minWidth: '260px', maxWidth: '380px', flex: 1 }}>
          <Search
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '18px',
              height: '18px',
              color: '#9CA3AF',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de usuario..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: "'Centrale Sans Rounded', sans-serif",
              outline: 'none',
              color: '#36004E',
              backgroundColor: '#fff',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#AA1BF1';
              (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(170,27,241,0.1)';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#E5E7EB';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* User list */}
      {filteredUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<User style={{ width: '28px', height: '28px', color: '#9CA3AF' }} />}
            title="No se encontraron usuarios"
            description="Intenta con otro nombre de usuario."
          />
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {filteredUsers.map((user) => {
            const isExpanded = expandedUserId === user.id;

            return (
              <div key={user.id}>
                {/* User row */}
                <Card
                  hover
                  onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Avatar */}
                    <Avatar src={user.avatar_url} name={user.name} size="lg" />

                    {/* Name + badge */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span
                          style={{
                            fontFamily: "'Isidora Alt Bold', sans-serif",
                            fontSize: '16px',
                            color: '#36004E',
                          }}
                        >
                          {user.name}
                        </span>
                        <Badge variant={user.role === 'client' ? 'info' : 'purple'} size="sm">
                          {user.role === 'client' ? 'Cliente' : 'Especialista'}
                        </Badge>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '13px',
                          color: '#6B7280',
                          margin: 0,
                        }}
                      >
                        {user.conversations.length}{' '}
                        {user.conversations.length === 1 ? 'conversacion' : 'conversaciones'}
                      </p>
                    </div>

                    {/* Expand icon */}
                    <div style={{ flexShrink: 0, color: '#9CA3AF' }}>
                      {isExpanded ? (
                        <ChevronDown style={{ width: '20px', height: '20px' }} />
                      ) : (
                        <ChevronRight style={{ width: '20px', height: '20px' }} />
                      )}
                    </div>
                  </div>
                </Card>

                {/* Expanded conversations */}
                {isExpanded && (
                  <div
                    style={{
                      marginLeft: '32px',
                      marginTop: '4px',
                      borderLeft: '3px solid rgba(170,27,241,0.2)',
                      paddingLeft: '16px',
                      display: 'grid',
                      gap: '8px',
                    }}
                  >
                    {user.conversations
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.last_message_at).getTime() -
                          new Date(a.last_message_at).getTime(),
                      )
                      .map((conv) => {
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        return (
                          <div
                            key={conv.quote_id}
                            onClick={() => setSelectedConversation(conv)}
                            style={{
                              padding: '14px 16px',
                              backgroundColor: '#fff',
                              border: '1px solid #F3F4F6',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'box-shadow 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#AA1BF1';
                              (e.currentTarget as HTMLDivElement).style.boxShadow =
                                '0 2px 8px rgba(170,27,241,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLDivElement).style.borderColor = '#F3F4F6';
                              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageCircle
                                  style={{ width: '14px', height: '14px', color: '#AA1BF1' }}
                                />
                                <span
                                  style={{
                                    fontFamily: "'Centrale Sans Rounded', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#36004E',
                                  }}
                                >
                                  {otherPartyName(conv, user.id)}
                                </span>
                                {conv.service_request?.category && (
                                  <Badge variant="info" size="sm">
                                    {conv.service_request.category}
                                  </Badge>
                                )}
                              </div>
                              <span
                                style={{
                                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                                  fontSize: '12px',
                                  color: '#9CA3AF',
                                  flexShrink: 0,
                                }}
                              >
                                {formatDate(conv.last_message_at)}
                              </span>
                            </div>

                            <p
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '13px',
                                color: '#6B7280',
                                margin: '0 0 4px 0',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {lastMsg?.content || '(sin mensajes)'}
                            </p>

                            <span
                              style={{
                                fontFamily: "'Centrale Sans Rounded', sans-serif",
                                fontSize: '12px',
                                color: '#9CA3AF',
                              }}
                            >
                              {conv.message_count}{' '}
                              {conv.message_count === 1 ? 'mensaje' : 'mensajes'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Conversation Detail Modal ---- */}
      <Modal
        isOpen={!!selectedConversation}
        onClose={() => setSelectedConversation(null)}
        title="Detalle de Conversacion"
        size="lg"
      >
        {selectedConversation && (
          <div>
            {/* Participants */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar
                  src={selectedConversation.client_profile?.avatar_url}
                  name={selectedConversation.client_profile?.first_name}
                  size="lg"
                />
                <div>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '12px',
                      color: '#9CA3AF',
                      margin: '0 0 2px 0',
                    }}
                  >
                    Cliente
                  </p>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#36004E',
                      margin: 0,
                    }}
                  >
                    {selectedConversation.client_profile?.first_name}{' '}
                    {selectedConversation.client_profile?.last_name_paterno}
                  </p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar
                  src={selectedConversation.specialist_profile?.avatar_url}
                  name={selectedConversation.specialist_profile?.first_name}
                  size="lg"
                />
                <div>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '12px',
                      color: '#9CA3AF',
                      margin: '0 0 2px 0',
                    }}
                  >
                    Especialista
                  </p>
                  <p
                    style={{
                      fontFamily: "'Centrale Sans Rounded', sans-serif",
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#36004E',
                      margin: 0,
                    }}
                  >
                    {selectedConversation.specialist_profile?.first_name}{' '}
                    {selectedConversation.specialist_profile?.last_name_paterno}
                  </p>
                </div>
              </div>
            </div>

            {/* Service context */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              <p
                style={{
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '12px',
                  color: '#9CA3AF',
                  margin: '0 0 4px 0',
                }}
              >
                Servicio
              </p>
              <p
                style={{
                  fontFamily: "'Centrale Sans Rounded', sans-serif",
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#36004E',
                  margin: 0,
                }}
              >
                {selectedConversation.service_request?.category ||
                  selectedConversation.service_request?.activity ||
                  'Sin especificar'}
              </p>
            </div>

            {/* Messages thread */}
            <div
              style={{
                maxHeight: '400px',
                overflowY: 'auto',
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '12px',
                marginBottom: '24px',
              }}
            >
              {selectedConversation.messages.map((message: any, index: number) => {
                const isClient =
                  message.sender_id === selectedConversation.client_profile?.id;
                const senderProfile = isClient
                  ? selectedConversation.client_profile
                  : selectedConversation.specialist_profile;

                return (
                  <div
                    key={message.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom:
                        index < selectedConversation.messages.length - 1 ? '16px' : 0,
                    }}
                  >
                    <Avatar
                      src={senderProfile?.avatar_url}
                      name={senderProfile?.first_name}
                      size="sm"
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#36004E',
                          }}
                        >
                          {senderProfile?.first_name || 'Usuario'}
                        </span>
                        <Badge variant={isClient ? 'info' : 'purple'} size="sm">
                          {isClient ? 'Cliente' : 'Especialista'}
                        </Badge>
                        <span
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '12px',
                            color: '#9CA3AF',
                          }}
                        >
                          {formatFullDate(message.created_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          padding: '12px 16px',
                          backgroundColor: isClient ? '#DBEAFE' : 'white',
                          borderRadius: '12px',
                          borderTopLeftRadius: '4px',
                        }}
                      >
                        <p
                          style={{
                            fontFamily: "'Centrale Sans Rounded', sans-serif",
                            fontSize: '14px',
                            color: '#36004E',
                            margin: 0,
                            lineHeight: 1.5,
                          }}
                        >
                          {message.content}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('¿Estas seguro de eliminar este mensaje?')) {
                            deleteMessage(message.id);
                          }
                        }}
                        style={{
                          marginTop: '4px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: "'Centrale Sans Rounded', sans-serif",
                          fontSize: '12px',
                          color: '#EF4444',
                        }}
                      >
                        <Trash2 style={{ width: '12px', height: '12px' }} />
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #F3F4F6',
              }}
            >
              <Button variant="ghost" onClick={() => setSelectedConversation(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
