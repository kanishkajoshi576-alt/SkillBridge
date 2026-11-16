package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "community_likes", uniqueConstraints = @UniqueConstraint(columnNames = {"post_id", "user_id"}),
        indexes = @Index(name = "idx_community_likes_user", columnList = "user_id"))
public class CommunityLike {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "post_id")
    private CommunityPost post;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "user_id")
    private User user;
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    protected CommunityLike() {}
    public CommunityLike(CommunityPost post, User user) { this.post = post; this.user = user; }
}
