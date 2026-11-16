package com.skillbridge.service;

import com.skillbridge.model.EmailVerificationToken;
import com.skillbridge.model.User;
import com.skillbridge.repository.EmailVerificationTokenRepository;
import com.skillbridge.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.mockito.ArgumentCaptor;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class EmailVerificationServiceTest {
    @Test
    void verificationLinkUsesSingleUseHashedTokenAndActivatesAccount() {
        UserRepository users = mock(UserRepository.class);
        EmailVerificationTokenRepository tokens = mock(EmailVerificationTokenRepository.class);
        ObjectProvider<JavaMailSender> providers = mock(ObjectProvider.class);
        JavaMailSender sender = mock(JavaMailSender.class);
        when(providers.getIfAvailable()).thenReturn(sender);
        when(tokens.save(any(EmailVerificationToken.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tokens.findByUserAndConsumedFalse(any(User.class))).thenReturn(java.util.List.of());
        User user = new User("Email Learner", "email@example.test", "hash", null);
        user.setEmailVerified(false);
        EmailVerificationService service = new EmailVerificationService(users, tokens, providers,
                "smtp.example.test", "noreply@example.test", "https://skillbridge.example");

        service.sendVerification(user);

        ArgumentCaptor<SimpleMailMessage> mail = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(mail.capture());
        Matcher fragment = Pattern.compile("#token=([A-Za-z0-9_-]{40,})").matcher(mail.getValue().getText());
        assertThat(fragment.find()).isTrue();
        ArgumentCaptor<EmailVerificationToken> storedCaptor = ArgumentCaptor.forClass(EmailVerificationToken.class);
        verify(tokens).save(storedCaptor.capture());
        EmailVerificationToken stored = storedCaptor.getValue();
        String rawToken = fragment.group(1);
        assertThat(stored.getTokenHash()).isNotEqualTo(rawToken);
        when(tokens.findByTokenHashAndConsumedFalse(stored.getTokenHash())).thenReturn(Optional.of(stored));

        service.verify(rawToken);

        assertThat(user.isEmailVerified()).isTrue();
        assertThat(stored.isConsumed()).isTrue();
    }
}
