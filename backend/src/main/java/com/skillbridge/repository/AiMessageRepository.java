package com.skillbridge.repository;

import com.skillbridge.model.AiConversation;
import com.skillbridge.model.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AiMessageRepository extends JpaRepository<AiMessage, Long> {
    List<AiMessage> findByConversationOrderByCreatedAtAsc(AiConversation conversation);
}
