package com.xinmengqaq.springboot.admin.testsupport;

import org.apache.ibatis.annotations.Param;

public interface BasicQueryMapper {

    String selectNameById(@Param("id") Integer id);
}

