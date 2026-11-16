package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "email_verification_tokens", indexes = @Index(name = "idx_email_verification_user_created", columnList = "user_id, created_at"))
public class EmailVerificationToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(name = "token_hash", nullable = false, length = 64, unique = true)
    private String tokenHash;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant expiresAt;
    @Column(nullable = false)
    private boolean consumed;
    protected EmailVerificationToken() {}
    public EmailVerificationToken(User user, String tokenHash, Instant expiresAt) {
        this.user = user; this.tokenHash = tokenHash; this.expiresAt = expiresAt;
    }
    public User getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public boolean isConsumed() { return consumed; }
    public void consume() { consumed = true; }
}
