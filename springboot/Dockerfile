FROM eclipse-temurin:21-jre

WORKDIR /app

COPY springboot-web/target/springboot-web-0.0.1-SNAPSHOT.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]

EXPOSE 9090

