package com.skillbridge.security;

import com.skillbridge.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationHours;

    public JwtService(@Value("${skillbridge.jwt.secret}") String secret,
                      @Value("${skillbridge.jwt.expiration-hours:24}") long expirationHours) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalArgumentException("SKILLBRIDGE_JWT_SECRET must contain at least 32 characters.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationHours = expirationHours;
    }

    public String issue(User user) {
        Instant now = Instant.now();
        return Jwts.builder().subject(user.getEmail()).claim("role", user.getRole())
                .issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(expirationHours * 3600)))
                .signWith(key).compact();
    }

    public String subject(String token) { return claims(token).getSubject(); }

    public boolean isValid(String token, String email) {
        Claims claims = claims(token);
        return email.equalsIgnoreCase(claims.getSubject()) && claims.getExpiration().after(new Date());
    }

    private Claims claims(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }
}
