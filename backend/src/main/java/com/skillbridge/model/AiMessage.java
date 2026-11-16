package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ai_messages", indexes = @Index(name = "idx_ai_messages_conversation_created", columnList = "conversation_id, created_at"))
public class AiMessage {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "conversation_id")
    private AiConversation conversation;
    @Column(nullable = false, length = 20)
    private String role;
    @Column(nullable = false, length = 8000)
    private String content;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected AiMessage() {}
    public AiMessage(AiConversation conversation, String role, String content) { this.conversation = conversation; this.role = role; this.content = content; }
    public String getRole() { return role; }
    public String getContent() { return content; }
    public Instant getCreatedAt() { return createdAt; }
}
