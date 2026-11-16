package com.skillbridge.service;

import com.skillbridge.model.PasswordResetCode;
import com.skillbridge.model.User;
import com.skillbridge.repository.PasswordResetCodeRepository;
import com.skillbridge.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class PasswordResetService {
    private static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    private static final Pattern SIX_DIGITS = Pattern.compile("\\d{6}");

    private final UserRepository users;
    private final PasswordResetCodeRepository codes;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final SecureRandom random = new SecureRandom();
    private final String mailHost;
    private final String mailFrom;

    public PasswordResetService(UserRepository users, PasswordResetCodeRepository codes,
                                PasswordEncoder passwordEncoder, ObjectProvider<JavaMailSender> mailSenders,
                                @Value("${spring.mail.host:}") String mailHost,
                                @Value("${skillbridge.mail.from:noreply@skillbridge.local}") String mailFrom) {
        this.users = users;
        this.codes = codes;
        this.passwordEncoder = passwordEncoder;
        this.mailSenders = mailSenders;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void requestCode(String email) {
        JavaMailSender sender = mailSenders.getIfAvailable();
        if (mailHost.isBlank() || sender == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured. Ask the administrator to configure SMTP.");
        }

        User user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        if (user == null) return;

        Instant now = Instant.now();
        if (codes.existsByUserAndCreatedAtAfter(user, now.minus(RESEND_COOLDOWN))) return;
        codes.findByUserAndConsumedFalse(user).forEach(PasswordResetCode::consume);

        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        PasswordResetCode resetCode = codes.save(new PasswordResetCode(
                user, passwordEncoder.encode(code), now.plus(CODE_LIFETIME)));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(user.getEmail());
        message.setSubject("Your SkillBridge password reset code");
        message.setText("Hello " + user.getName() + ",\n\nYour password reset code is " + code
                + ". It expires in 10 minutes. If you did not request this, you can ignore this email.");
        try {
            sender.send(message);
        } catch (RuntimeException error) {
            resetCode.consume();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "We could not send the reset email. Check the SMTP settings and try again.", error);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ResponseStatusException.class)
    public void resetPassword(String email, String code, String newPassword) {
        User user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        PasswordResetCode resetCode = user == null ? null
                : codes.findFirstByUserAndConsumedFalseOrderByCreatedAtDesc(user).orElse(null);
        if (resetCode == null || !SIX_DIGITS.matcher(code).matches()
                || resetCode.getExpiresAt().isBefore(Instant.now())
                || resetCode.getAttempts() >= MAX_ATTEMPTS) {
            throw invalidCode();
        }

        if (!passwordEncoder.matches(code, resetCode.getCodeHash())) {
            resetCode.incrementAttempts();
            if (resetCode.getAttempts() >= MAX_ATTEMPTS) resetCode.consume();
            throw invalidCode();
        }

        resetCode.consume();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    private ResponseStatusException invalidCode() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That reset code is invalid or expired. Request a new code and try again.");
    }
}
