package com.skillbridge.repository;

import com.skillbridge.model.CommunityPost;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {
    boolean existsByAuthor_EmailEndingWith(String emailSuffix);

    @Query("select p from CommunityPost p where p.status = 'ACTIVE' and " +
            "(:query is null or lower(p.body) like lower(concat('%', :query, '%')) or " +
            "lower(coalesce(p.skillTag, '')) like lower(concat('%', :query, '%'))) order by p.createdAt desc")
    List<CommunityPost> search(@Param("query") String query, Pageable pageable);
    @Query("select count(p) from CommunityPost p where p.status = 'ACTIVE' and " +
            "(:query is null or lower(p.body) like lower(concat('%', :query, '%')) or " +
            "lower(coalesce(p.skillTag, '')) like lower(concat('%', :query, '%'))) ")
    long countSearch(@Param("query") String query);
}
