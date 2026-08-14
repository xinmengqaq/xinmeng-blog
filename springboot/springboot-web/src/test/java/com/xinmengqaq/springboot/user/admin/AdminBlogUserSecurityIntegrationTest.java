package com.xinmengqaq.springboot.user.admin;

import com.xinmengqaq.springboot.SpringbootApplication;
import com.xinmengqaq.springboot.utils.JwtUtils;
import jakarta.annotation.Resource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(
        classes = SpringbootApplication.class,
        properties = {
                "spring.datasource.hikari.connection-init-sql=CREATE SCHEMA IF NOT EXISTS admin_user_boundary_test; SET search_path TO admin_user_boundary_test",
                "jwt.secret=eGlubWVuZ3FhcS1ibG9nLXNwcmluZ2Jvb3Q0LTIwMjY=",
                "jwt.expire-seconds=3600",
                "jwt.clock-skew-seconds=0"
        }
)
@AutoConfigureMockMvc
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AdminBlogUserSecurityIntegrationTest {

    @Resource
    private MockMvc mockMvc;

    @Resource
    private JwtUtils jwtUtils;

    @Resource
    private DataSource dataSource;

    @BeforeEach
    void assertTestDatabase() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.getMetaData().getURL()).contains("/springboot_vue_test");
            try (Statement statement = connection.createStatement();
                 ResultSet resultSet = statement.executeQuery("SELECT current_database(), current_schema()")) {
                assertThat(resultSet.next()).isTrue();
                assertThat(resultSet.getString(1)).isEqualTo("springboot_vue_test");
                assertThat(resultSet.getString(2)).isEqualTo("admin_user_boundary_test");
            }
        }
    }

    @Test
    @DisplayName("普通用户 JWT 访问管理员普通用户管理接口会在 MVC 拦截器处被拒绝")
    void userTokenCannotAccessAdminUserManagementEndpoint() throws Exception {
        String userToken = jwtUtils.createUserToken(12L, 3);

        mockMvc.perform(get("/api/admin/users")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("401"));
    }
}
