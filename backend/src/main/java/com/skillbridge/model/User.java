package com.skillbridge.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(columnNames = "email"), indexes = @Index(name = "idx_users_status_created", columnList = "status, created_at"))
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 80)
    private String name;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(nullable = false)
    private String passwordHash;
    @Column(length = 160)
    private String college;
    @Column(length = 500)
    private String bio;
    @Column(length = 2048)
    private String profileImage;
    @Column(length = 40)
    private String phone;
    @Column(length = 1000)
    private String certifications;
    @Column(nullable = false, length = 20)
    private String role = "USER";
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";
    @Column(nullable = false)
    private boolean safetyAcknowledged;
    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean emailVerified = true;
    @Embedded
    private UserPrivacySettings privacySettings = new UserPrivacySettings();
    @Column(nullable = false)
    private Instant createdAt = Instant.now();
    @Column(nullable = false)
    private Instant updatedAt = Instant.now();

    protected User() {}
    public User(String name, String email, String passwordHash, String college) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.college = college;
    }
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getCollege() { return college; }
    public void setCollege(String college) { this.college = college; }
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getProfileImage() { return profileImage; }
    public void setProfileImage(String profileImage) { this.profileImage = profileImage; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCertifications() { return certifications; }
    public void setCertifications(String certifications) { this.certifications = certifications; }
    public String getRole() { return role; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public boolean isSafetyAcknowledged() { return safetyAcknowledged; }
    public void setSafetyAcknowledged(boolean safetyAcknowledged) { this.safetyAcknowledged = safetyAcknowledged; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public UserPrivacySettings getPrivacySettings() {
        if (privacySettings == null) privacySettings = new UserPrivacySettings();
        return privacySettings;
    }
    public void setPrivacySettings(UserPrivacySettings privacySettings) { this.privacySettings = privacySettings; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
