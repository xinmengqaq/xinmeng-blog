# syntax=docker/dockerfile:1

FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY pom.xml ./
COPY springboot-common/pom.xml springboot-common/pom.xml
COPY springboot-admin/pom.xml springboot-admin/pom.xml
COPY springboot-article/pom.xml springboot-article/pom.xml
COPY springboot-site/pom.xml springboot-site/pom.xml
COPY springboot-user/pom.xml springboot-user/pom.xml
COPY springboot-web/pom.xml springboot-web/pom.xml

RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl springboot-web -am dependency:go-offline

COPY . .

RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -pl springboot-web -am package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /workspace/springboot-web/target/springboot-web-*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]

EXPOSE 9090

