package com.skillbridge.repository;

import com.skillbridge.model.ChatMessage;
import com.skillbridge.model.LearningConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByConnectionOrderByCreatedAtAsc(LearningConnection connection);
}
