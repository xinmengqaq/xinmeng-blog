package com.xinmengqaq.springboot.user.service.impl;

import com.github.benmanes.caffeine.cache.Cache;
import com.xinmengqaq.springboot.common.enums.ErrorCode;
import com.xinmengqaq.springboot.common.exception.BusinessException;
import com.xinmengqaq.springboot.config.email.EmailCodeGenerator;
import com.xinmengqaq.springboot.config.email.EmailCodeRecord;
import com.xinmengqaq.springboot.user.enums.EmailCodePurpose;
import com.xinmengqaq.springboot.user.service.BlogUserEmailService;
import jakarta.annotation.Resource;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@Slf4j
public class BlogUserEmailServiceImpl implements BlogUserEmailService {


    @Resource
    private EmailCodeGenerator emailCodeGenerator;

    @Resource
    private JavaMailSender javaMailSender;

    @Resource(name = "emailCodeCache")
    private Cache<String, EmailCodeRecord> emailCodeCache;

    @Resource(name = "emailCodeCooldownCache")
    private Cache<String, Boolean> emailCodeCooldownCache;

    @Resource(name = "emailCodeIpWindowCache")
    private Cache<String, AtomicInteger> emailCodeIpRateCache;

    @Resource(name = "emailCodeEmailWindowCache")
    private Cache<String, AtomicInteger> emailCodeEmailRateCache;

    @Value("${spring.mail.username}")
    private String fromAddress;

    public void send(EmailCodePurpose purpose, String email, String clientIp){
        //1.规范邮箱
        String validEmail = email.strip().toLowerCase(Locale.ROOT);

        //2. 拼凑键
        String cacheKey = "user:" + purpose.getValue() + ":" + validEmail;

        String ipLimitKey = "user:email-code:ip:" + clientIp;

        //检查冷却
        if (emailCodeCooldownCache.getIfPresent(cacheKey) != null){
            log.warn("邮箱验证码发送被冷却拦截，purpose={}, clientIp={}", purpose.getValue(), clientIp);
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,"冷却中，请稍后再试");
        }

        //检查IP限额
        AtomicInteger ipCount = emailCodeIpRateCache.get(ipLimitKey , key-> new AtomicInteger());
        if (ipCount.incrementAndGet() > 20){
            log.warn("邮箱验证码发送被IP限频拦截，purpose={}, clientIp={}", purpose.getValue(), clientIp);
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,"请求频繁请稍后再试");
        }

        //检查邮箱限额
        AtomicInteger emailCount = emailCodeEmailRateCache.get(cacheKey, key -> new AtomicInteger());
        if (emailCount.incrementAndGet() > 20){
            log.warn("邮箱验证码发送被邮箱限频拦截，purpose={}, clientIp={}", purpose.getValue(), clientIp);
            throw new BusinessException(ErrorCode.TOO_MANY_REQUESTS,"请求邮箱频繁请稍后再试");
        }

        String emailCode = emailCodeGenerator.generate();

        sendVerificationEmail(purpose,validEmail,emailCode);

        emailCodeCache.put(cacheKey,new EmailCodeRecord(Integer.parseInt(emailCode),0));
        emailCodeCooldownCache.put(cacheKey, true);

        log.info("邮箱验证码发送成功，purpose={}, clientIp={}", purpose.getValue(), clientIp);
    }

    public Boolean consume(EmailCodePurpose purpose, String email, String inputCode){
        String validEmail = email.strip().toLowerCase(Locale.ROOT);

        String cacheKey = "user:" + purpose.getValue() + ":" + validEmail;

        EmailCodeRecord result = emailCodeCache.asMap().compute(cacheKey,(K,record) ->{
            if(record == null){
                log.warn("邮箱验证码消费失败，验证码不存在或已过期，purpose={}", purpose.getValue());
                throw new BusinessException(ErrorCode.NOT_FOUND,"验证码不存在或已过期");
            }
            if (record.getCode() == Integer.parseInt(inputCode)){
                return null;
            }

            int newCount = record.getErrorCount() + 1 ;
            record.setErrorCount(newCount);
            return record;
        });

        if (result == null) {
            log.info("邮箱验证码消费成功，purpose={}", purpose.getValue());
        } else {
            log.warn("邮箱验证码消费失败，验证码错误，purpose={}", purpose.getValue());
        }

        return result == null;
    }


    private void sendVerificationEmail(EmailCodePurpose purpose, String email, String emailCode) {
        try {
            MimeMessage mimeMessage = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    mimeMessage, true, StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromAddress);
            helper.setTo(email);
            helper.setSubject("【薪梦集】" + purpose.getValue() + "验证码");
            helper.setText(buildVerificationEmailHtml(purpose, emailCode), true);

            helper.addInline(
                    "email-icon",
                    new ClassPathResource("assets/user/email-icon.png"),
                    "image/png"
            );

            javaMailSender.send(mimeMessage);
            log.info("邮箱验证码邮件发送成功，purpose={}", purpose.getValue());
        } catch (Exception exception) {
            log.error("邮箱验证码邮件发送失败，purpose={}", purpose.getValue(), exception);
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "验证码发送失败，请稍后再试");
        }
    }

    private String buildVerificationEmailHtml(EmailCodePurpose purpose, String emailCode) {
        return """
            <!doctype html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>验证码通知</title>
            </head>
            <body style="margin:0;padding:0;background:#f8f5f6;color:#29252a;
                         font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',
                         'Microsoft YaHei',Arial,sans-serif;">
                <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                       style="width:100%%;background:#f8f5f6;">
                    <tr>
                        <td align="center" style="padding:32px 16px;">
                            <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                                   style="width:100%%;max-width:600px;background:#ffffff;
                                          border:1px solid #eadce1;border-radius:8px;">
                                <tr>
                                    <td align="center" style="padding:28px 32px 12px;background:#fff4f6;
                                                               border-radius:8px 8px 0 0;">
                                        <img src="cid:email-icon" width="112" height="112"
                                             alt="邮箱验证码插画"
                                             style="display:block;width:112px;height:112px;border:0;">
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:24px 32px 32px;">
                                        <h1 style="margin:0 0 16px;font-size:24px;line-height:1.4;
                                                   font-weight:700;color:#29252a;">
                                            {{PURPOSE}}验证码
                                        </h1>

                                        <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#514b50;">
                                            你正在进行{{PURPOSE}}操作。请在 10 分钟内输入下方验证码完成验证。
                                        </p>

                                        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                               style="width:100%%;background:#fff0f4;border:1px solid #f2cad6;
                                                      border-radius:8px;">
                                            <tr>
                                                <td align="center" style="padding:22px 16px;">
                                                    <span style="display:block;font-family:Consolas,'Courier New',monospace;
                                                                 font-size:32px;line-height:1;font-weight:700;
                                                                 letter-spacing:6px;color:#9e3153;">
                                                        {{CODE}}
                                                    </span>
                                                </td>
                                            </tr>
                                        </table>

                                        <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#6d656a;">
                                            验证码将在 10 分钟后失效。请勿将验证码告知他人；如非本人操作，请忽略此邮件。
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding:18px 32px;border-top:1px solid #f0e5e8;
                                               font-size:12px;line-height:1.6;color:#8b8186;">
                                        此邮件由系统自动发送，请勿直接回复。
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            """
                .replace("{{PURPOSE}}", purpose.getValue())
                .replace("{{CODE}}", emailCode);
    }

}
