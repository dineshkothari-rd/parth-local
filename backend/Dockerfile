FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B dependency:go-offline
COPY src src
RUN ./mvnw -B package -DskipTests

FROM eclipse-temurin:17-jre-jammy
RUN groupadd --system nearkart && useradd --system --gid nearkart nearkart
WORKDIR /app
COPY --from=build /workspace/target/nearkart-*.jar app.jar
USER nearkart
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
