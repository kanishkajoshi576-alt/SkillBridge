package com.skillbridge.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.net.http.HttpClient;
import java.time.Duration;

@Service
public class AiService {
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final int timeoutSeconds;

    public AiService(@Value("${skillbridge.ai.base-url:}") String baseUrl,
                     @Value("${skillbridge.ai.api-key:}") String apiKey,
                     @Value("${skillbridge.ai.model:}") String model,
                     @Value("${skillbridge.ai.timeout-seconds:30}") int timeoutSeconds) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.timeoutSeconds = timeoutSeconds;
    }

    public String answer(String question, List<Map<String, String>> history) {
        if (baseUrl.isBlank() || apiKey.isBlank() || model.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "The AI service is not configured yet. Add AI_BASE_URL, AI_API_KEY and AI_MODEL on the server.");
        }
        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content",
                "You are SkillBridge's learning helper. Explain accurately, adapt to the learner, and say when you are unsure. Do not claim certainty you do not have. Keep private personal data out of responses."));
        for (Map<String, String> item : history) {
            String role = item.get("role");
            String content = item.get("content");
            if (("user".equals(role) || "assistant".equals(role)) && content != null && content.length() <= 8000) {
                messages.add(Map.of("role", role, "content", content));
            }
        }
        messages.add(Map.of("role", "user", "content", question));
        try {
            HttpClient httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(timeoutSeconds)).build();
            JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
            requestFactory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
            Map<?, ?> response = RestClient.builder().requestFactory(requestFactory).baseUrl(baseUrl.replaceAll("/+$", ""))
                    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                    .build().post().uri("/v1/chat/completions")
                    .body(Map.of("model", model, "messages", messages, "temperature", 0.3))
                    .retrieve().body(Map.class);
            if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI provider returned no answer.");
            }
            Object first = choices.get(0);
            if (!(first instanceof Map<?, ?> choice) || !(choice.get("message") instanceof Map<?, ?> message)
                    || !(message.get("content") instanceof String content) || content.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI provider returned an unreadable answer.");
            }
            return content;
        } catch (ResponseStatusException error) {
            throw error;
        } catch (RestClientException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The AI service could not answer right now. Please try again later.", error);
        }
    }
}
