package com.skillbridge.service;

import com.skillbridge.model.LoginVerificationCode;
import com.skillbridge.model.User;
import com.skillbridge.repository.LoginVerificationCodeRepository;
import com.skillbridge.repository.UserRepository;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class LoginVerificationService {
    private static final Duration CODE_LIFETIME = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_ATTEMPTS = 5;
    private static final Pattern SIX_DIGITS = Pattern.compile("\\d{6}");

    private final UserRepository users;
    private final LoginVerificationCodeRepository codes;
    private final PasswordEncoder passwordEncoder;
    private final ObjectProvider<JavaMailSender> mailSenders;
    private final String mailHost;
    private final String mailFrom;
    private final String demoOtpRecipient;
    private final SecureRandom random = new SecureRandom();

    public LoginVerificationService(UserRepository users, LoginVerificationCodeRepository codes,
                                    PasswordEncoder passwordEncoder, ObjectProvider<JavaMailSender> mailSenders,
                                    @Value("${spring.mail.host:}") String mailHost,
                                    @Value("${skillbridge.mail.from:noreply@skillbridge.local}") String mailFrom,
                                    @Value("${skillbridge.auth.demo-otp-recipient:}") String demoOtpRecipient) {
        this.users = users;
        this.codes = codes;
        this.passwordEncoder = passwordEncoder;
        this.mailSenders = mailSenders;
        this.mailHost = mailHost;
        this.mailFrom = mailFrom;
        this.demoOtpRecipient = demoOtpRecipient;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendCode(User user) {
        JavaMailSender sender = mailSenders.getIfAvailable();
        if (mailHost.isBlank() || sender == null) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Login verification email is not configured. Ask the administrator to configure SMTP.");
        }

        Instant now = Instant.now();
        if (codes.existsByUserAndCreatedAtAfter(user, now.minus(RESEND_COOLDOWN))) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "A sign-in code was sent recently. Check your inbox before trying again.");
        }

        codes.findByUserAndConsumedFalse(user).forEach(LoginVerificationCode::consume);
        String code = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        LoginVerificationCode verificationCode = codes.save(new LoginVerificationCode(
                user, passwordEncoder.encode(code), now.plus(CODE_LIFETIME)));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        boolean demoRecipient = user.getEmail().toLowerCase(Locale.ROOT).endsWith("@demo.skillbridge.local")
                && !demoOtpRecipient.isBlank();
        message.setTo(demoRecipient ? demoOtpRecipient : user.getEmail());
        message.setSubject("Your SkillBridge sign-in code");
        String demoNotice = demoRecipient
                ? "\nThis is a sign-in code for the SkillBridge demo account " + user.getEmail() + ".\n"
                : "";
        message.setText("Hello " + user.getName() + ",\n" + demoNotice + "\nYour SkillBridge sign-in code is " + code
                + ". It expires in 10 minutes and can only be used once. If you did not try to sign in, you can ignore this email.");
        try {
            sender.send(message);
        } catch (RuntimeException error) {
            verificationCode.consume();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "We could not send your sign-in code. Check the SMTP settings and try again.", error);
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = ResponseStatusException.class)
    public User verifyCode(String email, String code) {
        User user = users.findByEmailIgnoreCase(email.trim()).orElse(null);
        LoginVerificationCode verificationCode = user == null ? null
                : codes.findFirstByUserAndConsumedFalseOrderByCreatedAtDesc(user).orElse(null);
        if (verificationCode == null || !SIX_DIGITS.matcher(code).matches()
                || verificationCode.getExpiresAt().isBefore(Instant.now())
                || verificationCode.getAttempts() >= MAX_ATTEMPTS) {
            throw invalidCode();
        }

        if (!passwordEncoder.matches(code, verificationCode.getCodeHash())) {
            verificationCode.incrementAttempts();
            if (verificationCode.getAttempts() >= MAX_ATTEMPTS) verificationCode.consume();
            throw invalidCode();
        }

        if (!"ACTIVE".equals(user.getStatus())) {
            verificationCode.consume();
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This account is currently unavailable. Contact support.");
        }

        verificationCode.consume();
        return user;
    }

    private ResponseStatusException invalidCode() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "That sign-in code is invalid or expired. Sign in again to request a new code.");
    }
}
