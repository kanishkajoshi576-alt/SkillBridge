package com.skillbridge.repository;

import com.skillbridge.model.LoginVerificationCode;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface LoginVerificationCodeRepository extends JpaRepository<LoginVerificationCode, Long> {
    List<LoginVerificationCode> findByUserAndConsumedFalse(User user);
    Optional<LoginVerificationCode> findFirstByUserAndConsumedFalseOrderByCreatedAtDesc(User user);
    boolean existsByUserAndCreatedAtAfter(User user, Instant createdAt);
}
