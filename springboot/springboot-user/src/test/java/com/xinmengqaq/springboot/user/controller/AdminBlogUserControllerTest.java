package com.xinmengqaq.springboot.user.controller;

import com.xinmengqaq.springboot.common.PageResult;
import com.xinmengqaq.springboot.common.exception.GlobalExceptionHandler;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserPageQueryDTO;
import com.xinmengqaq.springboot.user.dto.AdminBlogUserStatusDTO;
import com.xinmengqaq.springboot.user.service.AdminBlogUserService;
import com.xinmengqaq.springboot.user.vo.AdminBlogUserVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AdminBlogUserControllerTest {

    @Mock
    private AdminBlogUserService adminBlogUserService;

    @InjectMocks
    private AdminBlogUserController adminBlogUserController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminBlogUserController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("管理员分页接口绑定查询条件并且不返回认证内部字段")
    void pageUsersBindsQueryAndReturnsAdminView() throws Exception {
        when(adminBlogUserService.pageUsers(any())).thenReturn(pageResult(adminUser()));

        mockMvc.perform(get("/api/admin/users")
                        .param("page", "2")
                        .param("size", "5")
                        .param("keyword", " reader ")
                        .param("status", "enabled"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.page").value(2))
                .andExpect(jsonPath("$.data.size").value(5))
                .andExpect(jsonPath("$.data.total").value(1))
                .andExpect(jsonPath("$.data.list[0].id").value(12))
                .andExpect(jsonPath("$.data.list[0].email").value("reader@example.com"))
                .andExpect(jsonPath("$.data.list[0].status").value("enabled"))
                .andExpect(jsonPath("$.data.list[0].password").doesNotExist())
                .andExpect(jsonPath("$.data.list[0].passwordVersion").doesNotExist());

        ArgumentCaptor<AdminBlogUserPageQueryDTO> captor = ArgumentCaptor.forClass(AdminBlogUserPageQueryDTO.class);
        verify(adminBlogUserService).pageUsers(captor.capture());
        assertThat(captor.getValue().getPage()).isEqualTo(2);
        assertThat(captor.getValue().getSize()).isEqualTo(5);
        assertThat(captor.getValue().getKeyword()).isEqualTo(" reader ");
        assertThat(captor.getValue().getStatus()).isEqualTo("enabled");
    }

    @Test
    @DisplayName("管理员详情接口返回指定普通用户的管理视图")
    void getUserReturnsAdminView() throws Exception {
        when(adminBlogUserService.getUser(12L)).thenReturn(adminUser());

        mockMvc.perform(get("/api/admin/users/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.data.id").value(12))
                .andExpect(jsonPath("$.data.updatedAt").value("2026-08-09T13:00:00+08:00"))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        verify(adminBlogUserService).getUser(12L);
    }

    @Test
    @DisplayName("管理员状态接口调用服务并返回禁用结果")
    void changeStatusDelegatesAndReturnsDisabledMessage() throws Exception {
        mockMvc.perform(patch("/api/admin/users/12/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "disabled"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("用户已禁用"))
                .andExpect(jsonPath("$.data").doesNotExist());

        ArgumentCaptor<AdminBlogUserStatusDTO> captor = ArgumentCaptor.forClass(AdminBlogUserStatusDTO.class);
        verify(adminBlogUserService).changeStatus(org.mockito.ArgumentMatchers.eq(12L), captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo("disabled");
    }

    @Test
    @DisplayName("管理员删除接口调用物理删除并返回关联数据清理提示")
    void deleteUserDelegatesAndReturnsDeleteMessage() throws Exception {
        mockMvc.perform(delete("/api/admin/users/12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("200"))
                .andExpect(jsonPath("$.msg").value("用户删除成功，关联数据已清理"))
                .andExpect(jsonPath("$.data").doesNotExist());

        verify(adminBlogUserService).deleteUser(12L);
    }

    @Test
    @DisplayName("待删除状态不能作为管理员状态变更请求参数")
    void changeStatusRejectsPendingDeletionInputBeforeCallingService() throws Exception {
        mockMvc.perform(patch("/api/admin/users/12/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status": "pending_deletion"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"));

        verifyNoInteractions(adminBlogUserService);
    }

    @Test
    @DisplayName("分页参数超过公共上限时不会进入管理员用户查询服务")
    void pageUsersRejectsOversizedPageBeforeCallingService() throws Exception {
        mockMvc.perform(get("/api/admin/users").param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("400"));

        verifyNoInteractions(adminBlogUserService);
    }

    private PageResult<AdminBlogUserVO> pageResult(AdminBlogUserVO user) {
        PageResult<AdminBlogUserVO> result = new PageResult<>();
        result.setPage(2);
        result.setSize(5);
        result.setTotal(1L);
        result.setPages(1);
        result.setList(List.of(user));
        return result;
    }

    private AdminBlogUserVO adminUser() {
        return AdminBlogUserVO.builder()
                .id(12L)
                .email("reader@example.com")
                .nickname("小读者")
                .avatar("/files/avatar/reader.png")
                .status("enabled")
                .createdAt(OffsetDateTime.parse("2026-08-09T12:00:00+08:00"))
                .updatedAt(OffsetDateTime.parse("2026-08-09T13:00:00+08:00"))
                .build();
    }
}
