package com.skillbridge.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "password_reset_codes", indexes = {
        @Index(name = "idx_password_reset_user_created", columnList = "user_id,created_at")
})
public class PasswordResetCode {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String codeHash;

    @Column(nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts;

    @Column(nullable = false)
    private boolean consumed;

    protected PasswordResetCode() {}

    public PasswordResetCode(User user, String codeHash, Instant expiresAt) {
        this.user = user;
        this.codeHash = codeHash;
        this.expiresAt = expiresAt;
    }

    public User getUser() { return user; }
    public String getCodeHash() { return codeHash; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public int getAttempts() { return attempts; }
    public boolean isConsumed() { return consumed; }
    public void incrementAttempts() { attempts++; }
    public void consume() { consumed = true; }
}
