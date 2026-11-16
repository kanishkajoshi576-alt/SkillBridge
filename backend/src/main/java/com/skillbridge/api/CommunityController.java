package com.skillbridge.api;

import com.skillbridge.model.*;
import com.skillbridge.repository.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/community")
@Transactional
@Validated
public class CommunityController {
    private final UserRepository users;
    private final CommunityPostRepository posts;
    private final CommunityCommentRepository comments;
    private final CommunityLikeRepository likes;
    private final SafetyReportRepository reports;

    public CommunityController(UserRepository users, CommunityPostRepository posts,
                               CommunityCommentRepository comments, CommunityLikeRepository likes,
                               SafetyReportRepository reports) {
        this.users = users; this.posts = posts; this.comments = comments; this.likes = likes; this.reports = reports;
    }

    @GetMapping("/posts")
    public Map<String, Object> list(@RequestParam(required = false) String query,
                                    @RequestParam(defaultValue = "0") @jakarta.validation.constraints.Min(0) int page,
                                    @RequestParam(defaultValue = "10") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(50) int size,
                                    org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        String term = query == null || query.isBlank() ? null : query.trim();
        List<CommunityPost> matches = posts.search(term, PageRequest.of(page, size));
        return Map.of("items", matches.stream().map(post -> postDto(post, me)).toList(), "page", page,
                "size", size, "totalItems", posts.countSearch(term),
                "totalPages", (int) Math.ceil(posts.countSearch(term) / (double) size));
    }

    @PostMapping("/posts")
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody PostInput input,
                                                       org.springframework.security.core.Authentication authentication) {
        User author = currentUser(authentication.getName());
        CommunityPost post = posts.save(new CommunityPost(author, input.body().trim(), trim(input.skillTag())));
        return ResponseEntity.status(HttpStatus.CREATED).body(postDto(post, author));
    }

    @PutMapping("/posts/{id}")
    public Map<String, Object> edit(@PathVariable Long id, @Valid @RequestBody PostInput input,
                                    org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityPost post = post(id);
        requireOwner(post.getAuthor(), me);
        post.edit(input.body().trim(), trim(input.skillTag()));
        return postDto(post, me);
    }

    @DeleteMapping("/posts/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityPost post = post(id);
        requireOwner(post.getAuthor(), me);
        post.remove();
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/like")
    public Map<String, Object> toggleLike(@PathVariable Long id,
                                          org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityPost post = post(id);
        Optional<CommunityLike> existing = likes.findByPostAndUser(post, me);
        boolean liked;
        if (existing.isPresent()) { likes.delete(existing.get()); liked = false; }
        else { likes.save(new CommunityLike(post, me)); liked = true; }
        return Map.of("liked", liked, "likeCount", likes.countByPost(post));
    }

    @GetMapping("/posts/{id}/comments")
    public Map<String, Object> listComments(@PathVariable Long id,
                                            @RequestParam(defaultValue = "0") @jakarta.validation.constraints.Min(0) int page,
                                            @RequestParam(defaultValue = "30") @jakarta.validation.constraints.Min(1) @jakarta.validation.constraints.Max(100) int size,
                                            org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityPost post = post(id);
        List<CommunityComment> items = comments.findByPostOrderByCreatedAtAsc(post, PageRequest.of(page, size));
        return Map.of("items", items.stream().map(comment -> commentDto(comment, me)).toList(), "page", page,
                "size", size, "totalItems", comments.countByPost(post));
    }

    @PostMapping("/posts/{id}/comments")
    public ResponseEntity<Map<String, Object>> addComment(@PathVariable Long id,
                                                           @Valid @RequestBody CommentInput input,
                                                           org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityComment comment = comments.save(new CommunityComment(post(id), me, input.body().trim()));
        return ResponseEntity.status(HttpStatus.CREATED).body(commentDto(comment, me));
    }

    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id,
                                               org.springframework.security.core.Authentication authentication) {
        User me = currentUser(authentication.getName());
        CommunityComment comment = comments.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        requireOwner(comment.getAuthor(), me);
        comments.delete(comment);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/posts/{id}/report")
    public ResponseEntity<Map<String, Object>> reportPost(@PathVariable Long id,
                                                           @RequestBody(required = false) ReportInput input,
                                                           org.springframework.security.core.Authentication authentication) {
        User reporter = currentUser(authentication.getName());
        post(id);
        SafetyReport report = reports.save(new SafetyReport(reporter, "SPAM",
                input == null ? null : trim(input.description()), "POST", id));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", report.getId(), "status", report.getStatus()));
    }

    @PostMapping("/comments/{id}/report")
    public ResponseEntity<Map<String, Object>> reportComment(@PathVariable Long id,
                                                              @RequestBody(required = false) ReportInput input,
                                                              org.springframework.security.core.Authentication authentication) {
        User reporter = currentUser(authentication.getName());
        CommunityComment comment = comments.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found."));
        SafetyReport report = reports.save(new SafetyReport(reporter, "ABUSIVE_MESSAGE",
                input == null ? null : trim(input.description()), "COMMENT", comment.getId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", report.getId(), "status", report.getStatus()));
    }

    private CommunityPost post(Long id) {
        return posts.findById(id).filter(item -> "ACTIVE".equals(item.getStatus()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Post not found."));
    }

    private User currentUser(String email) {
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please log in again."));
        if (!"ACTIVE".equals(user.getStatus())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is unavailable.");
        return user;
    }

    private void requireOwner(User owner, User me) {
        if (!owner.getId().equals(me.getId()) && !"ADMIN".equals(me.getRole()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only change your own content.");
    }

    private Map<String, Object> postDto(CommunityPost post, User me) {
        boolean visible = post.getAuthor().getPrivacySettings().isProfileVisible();
        return Map.of("id", post.getId(), "authorId", visible ? post.getAuthor().getId() : 0L,
                "authorName", visible ? post.getAuthor().getName() : "SkillBridge member",
                "body", post.getBody(), "skillTag", Objects.requireNonNullElse(post.getSkillTag(), ""),
                "createdAt", post.getCreatedAt(), "likeCount", likes.countByPost(post),
                "likedByMe", likes.existsByPostAndUser(post, me), "commentCount", comments.countByPost(post),
                "mine", post.getAuthor().getId().equals(me.getId()));
    }

    private Map<String, Object> commentDto(CommunityComment comment, User me) {
        boolean visible = comment.getAuthor().getPrivacySettings().isProfileVisible();
        return Map.of("id", comment.getId(), "authorId", visible ? comment.getAuthor().getId() : 0L,
                "authorName", visible ? comment.getAuthor().getName() : "SkillBridge member",
                "body", comment.getBody(), "createdAt", comment.getCreatedAt(),
                "mine", comment.getAuthor().getId().equals(me.getId()));
    }

    private String trim(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    public record PostInput(@NotBlank @Size(max = 3000) String body, @Size(max = 100) String skillTag) {}
    public record CommentInput(@NotBlank @Size(max = 1000) String body) {}
    public record ReportInput(@Size(max = 1000) String description) {}
}
