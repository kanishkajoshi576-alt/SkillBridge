package com.skillbridge.repository;

import com.skillbridge.model.AiConversation;
import com.skillbridge.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AiConversationRepository extends JpaRepository<AiConversation, Long> {
    List<AiConversation> findByUserOrderByUpdatedAtDesc(User user);
    Optional<AiConversation> findByIdAndUser(Long id, User user);
}
