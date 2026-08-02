package com.xinmengqaq.springboot.common;

import com.github.pagehelper.PageInfo;
import lombok.Data;
import java.util.function.Function;
import java.util.List;

@Data
public class PageResult<T> {

    private Integer page; // 页码
    private Integer size; // 每页数量
    private Long total; // 总记录数
    private Integer pages; // 总页数
    private List<T> list; // 当前页的数据列表

/**
 * 将PageInfo对象转换为PageResult对象
 * 这是一个泛型方法，可以处理任何类型的PageInfo和PageResult
 *
 * @param <T> 泛型类型，表示Page中存储的数据类型
 * @param pageInfo 包含分页信息的PageInfo对象
 * @return 转换后的PageResult对象，包含分页数据和分页信息
 */
    public static <T> PageResult<T> of(PageInfo<T> pageInfo) {
    // 创建一个新的PageResult对象
        PageResult<T> result = new PageResult<>();
    // 设置当前页码
        result.setPage(pageInfo.getPageNum());
    // 设置每页大小
        result.setSize(pageInfo.getPageSize());
    // 设置总记录数
        result.setTotal(pageInfo.getTotal());
    // 设置总页数
        result.setPages(pageInfo.getPages());
    // 设置数据列表
        result.setList(pageInfo.getList());
    // 返回转换后的结果
        return result;
    }

    public static <S, T> PageResult<T> of(PageInfo<S> pageInfo, Function<S, T> converter) {
        PageResult<T> result = new PageResult<>();
        result.setPage(pageInfo.getPageNum());
        result.setSize(pageInfo.getPageSize());
        result.setTotal(pageInfo.getTotal());
        result.setPages(pageInfo.getPages());
        result.setList(pageInfo.getList().stream().map(converter).toList());
        return result;
    }


}

