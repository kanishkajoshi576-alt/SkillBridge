package com.skillbridge.service;

import com.skillbridge.model.EmailVerificationToken;
import com.skillbridge.model.User;
import com.skillbridge.repository.EmailVerificationTokenRepository;
import com.skillbridge.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

@Service
public class EmailVerificationService {
    private static final Duration TOKEN_LIFETIME = Duration.ofHours(24);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private final UserRepository users;
    private final EmailVerificationTokenRepository tokens;
    private final ObjectProvider<JavaMailSender> senders;
    private final String mailHost;
    private final String mailFrom;
    private final String frontendUrl;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationService(UserRepository users, EmailVerificationTokenRepository tokens,
                                    ObjectProvider<JavaMailSender> senders,
                                    @Value("${spring.mail.host:}") String mailHost,
                                    @Value("${skillbridge.mail.from:noreply@skillbridge.local}") String mailFrom,
                                    @Value("${skillbridge.frontend-url:http://localhost:5173}") String frontendUrl) {
        this.users = users; this.tokens = tokens; this.senders = senders;
        this.mailHost = mailHost; this.mailFrom = mailFrom; this.frontendUrl = frontendUrl;
    }

    public boolean isConfigured() { return !mailHost.isBlank() && senders.getIfAvailable() != null; }

    @Transactional
    public void sendVerification(User user) {
        JavaMailSender sender = configuredSender();
        Instant now = Instant.now();
        if (tokens.existsByUserAndCreatedAtAfter(user, now.minus(RESEND_COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "A verification email was sent recently. Check your inbox before requesting another.");
        }
        tokens.findByUserAndConsumedFalse(user).forEach(EmailVerificationToken::consume);
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        EmailVerificationToken token = tokens.save(new EmailVerificationToken(user, hash(raw), now.plus(TOKEN_LIFETIME)));
        String link = frontendUrl.replaceAll("/$", "") + "/verify-email#token=" + raw;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom); message.setTo(user.getEmail());
        message.setSubject("Verify your SkillBridge email");
        message.setText("Hello " + user.getName() + ",\n\nVerify your email address using this link:\n" + link
                + "\n\nThis link expires in 24 hours and can only be used once. If you did not create this account, you can ignore this email.");
        try { sender.send(message); }
        catch (RuntimeException error) {
            token.consume();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "We could not send the verification email. Check SMTP settings and try again.", error);
        }
    }

    @Transactional
    public void verify(String rawToken) {
        if (rawToken == null || rawToken.length() < 32 || rawToken.length() > 100) throw invalidToken();
        EmailVerificationToken token = tokens.findByTokenHashAndConsumedFalse(hash(rawToken)).orElseThrow(this::invalidToken);
        if (token.getExpiresAt().isBefore(Instant.now())) { token.consume(); throw invalidToken(); }
        token.consume(); token.getUser().setEmailVerified(true);
    }

    @Transactional
    public void resend(String email) {
        User user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user == null || user.isEmailVerified()) return;
        sendVerification(user);
    }

    private JavaMailSender configuredSender() {
        JavaMailSender sender = senders.getIfAvailable();
        if (mailHost.isBlank() || sender == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Email verification is not configured. Ask the administrator to configure SMTP.");
        return sender;
    }
    private String hash(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception error) { throw new IllegalStateException("Secure token hashing is unavailable.", error); }
    }
    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "This verification link is invalid or expired. Request a new one.");
    }
}
