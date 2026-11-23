---
title: Java Builds: Maven's pom.xml Explained, and Gradle
summary: How Java projects are built: Maven coordinates, every important section of pom.xml (parent, properties, dependencies and scopes, dependencyManagement and BOMs, plugins, profiles), the build lifecycle and phases, the local and remote repositories, transitive dependencies and conflicts, multi-module projects, the Spring Boot parent and fat JARs, and the Gradle equivalent with build.gradle.kts.
---

::widget Scene {"title": "mvn package, step by step", "sub": "what Maven does between reading pom.xml and producing app.jar", "nodes": [{"id": "pom", "kind": "doc", "label": "pom.xml", "x": 3.72, "y": 3.72, "color": "blue"}, {"id": "res", "kind": "cube", "label": "Resolve dependencies", "x": 4.5, "y": -4.5, "color": "orange"}, {"id": "repo", "kind": "cloud", "label": "Maven Central / Nexus", "x": 6.52, "y": -11.48, "color": "purple"}, {"id": "local", "kind": "disk", "label": "~/.m2/repository", "x": 12.1, "y": -5.9, "color": "teal"}, {"id": "life", "kind": "cpu", "label": "Lifecycle phases", "x": 11.94, "y": 2.94, "color": "green"}, {"id": "jar", "kind": "doc", "label": "target/orders-1.2.0.jar", "x": 18.92, "y": 0.92, "color": "green"}], "links": [["pom", "res"], ["res", "local"], ["local", "repo", {"dashed": true}], ["pom", "life"], ["life", "jar"]], "metrics": [["phase", "Phase"], ["plugin", "Plugin:goal"]], "steps": [{"short": "Read", "tag": "POM", "title": "Maven reads pom.xml and builds the effective POM", "body": "<p>Your POM + parent POMs (e.g. spring-boot-starter-parent) + defaults. mvn help:effective-pom shows the merged result.</p>", "show": ["pom"], "metrics": {"phase": ["-"], "plugin": ["-"]}}, {"short": "Coords", "tag": "Coordinates", "title": "Every artifact has coordinates: groupId:artifactId:version", "body": "<p>com.acme:orders:1.2.0. Dependencies are declared by coordinates too.</p>"}, {"short": "Resolve", "tag": "Dependencies", "title": "Resolve dependencies, including transitive ones", "body": "<p>spring-boot-starter-web brings Spring MVC, Jackson, Tomcat… Versions come from the dependencyManagement / BOM, so you rarely write them.</p>", "show": ["pom", "res", "local", "repo"], "flow": [["res", "local", "#f59e0b", "cached?"], ["local", "repo", "#a855f7", "download missing"]], "metrics": {"phase": ["resolve"]}}, {"short": "Compile", "tag": "compile", "title": "validate → compile: maven-compiler-plugin compiles src/main/java", "body": "<p>Each phase runs the plugin goals bound to it.</p>", "show": ["pom", "res", "local", "repo", "life"], "metrics": {"phase": ["compile"], "plugin": ["compiler:compile"]}}, {"short": "Test", "tag": "test", "title": "test-compile → test: Surefire runs unit tests", "body": "<p>A failing test stops the build. -DskipTests skips running them (avoid in CI).</p>", "metrics": {"phase": ["test"], "plugin": ["surefire:test"]}}, {"short": "Package", "tag": "package", "title": "package: build the JAR; Spring Boot's plugin repackages it as an executable fat JAR", "body": "<p>The fat JAR contains your classes plus all dependency JARs and a launcher: java -jar app.jar.</p>", "show": ["pom", "res", "local", "repo", "life", "jar"], "flow": [["life", "jar", "#22c55e", "jar + repackage"]], "metrics": {"phase": ["package"], "plugin": ["jar:jar, spring-boot:repackage"]}}, {"short": "Later", "tag": "Later phases", "title": "verify (integration tests), install (~/.m2), deploy (remote repo)", "body": "<p>Running a phase runs every earlier phase too: mvn install = validate…package…verify…install.</p>", "metrics": {"phase": ["verify → install → deploy"]}}, {"short": "Conflict", "tag": "Conflicts", "title": "Two dependencies need different versions of the same library", "body": "<p>Maven picks the nearest in the tree (\"nearest wins\"). Use dependencyManagement/BOMs to pin versions; mvn dependency:tree to debug.</p>", "note": {"kind": "key", "text": "pom.xml = coordinates + parent + properties + dependencies (with scopes) + dependencyManagement + plugins. Phases run in order; plugins do the work; ~/.m2 caches artifacts."}}]}

## Why every Java project has a pom.xml

Before build tools, Java projects shipped with a `lib/` folder full of JAR files and a shell script to compile them in the right order. **Maven** (2004) introduced a standard project layout, a declarative build file and central artifact repositories. Most Java backends, including Spring Boot services, are built with Maven or **Gradle**. If you work on a Java backend, knowing what's in `pom.xml` saves hours of "it works on my machine".

## Convention over configuration

```
orders/
  pom.xml
  src/main/java/com/acme/orders/...       # production code
  src/main/resources/application.yml       # config, templates, static files
  src/test/java/...                        # tests
  target/                                  # build output (ignored by git)
```

## pom.xml, section by section

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>

  <!-- 1. Parent: inherit defaults (plugin config, dependency versions) -->
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.4.1</version>
  </parent>

  <!-- 2. Coordinates: how others refer to this artifact -->
  <groupId>com.acme</groupId>
  <artifactId>orders</artifactId>
  <version>1.2.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <!-- 3. Properties: variables and settings -->
  <properties>
    <java.version>21</java.version>
    <testcontainers.version>1.20.4</testcontainers.version>
  </properties>

  <!-- 4. Dependencies: what the code needs -->
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>      <!-- version from the parent's BOM -->
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <scope>runtime</scope>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <!-- 5. Dependency management: pin versions without adding dependencies -->
  <dependencyManagement>
    <dependencies>
      <dependency>
        <groupId>org.testcontainers</groupId>
        <artifactId>testcontainers-bom</artifactId>
        <version>${testcontainers.version}</version>
        <type>pom</type>
        <scope>import</scope>
      </dependency>
    </dependencies>
  </dependencyManagement>

  <!-- 6. Build plugins -->
  <build>
    <plugins>
      <plugin>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-maven-plugin</artifactId>
      </plugin>
    </plugins>
  </build>

  <!-- 7. Profiles: optional variations -->
  <profiles>
    <profile><id>ci</id><properties><skipITs>false</skipITs></properties></profile>
  </profiles>
</project>
```

### Coordinates and versions

`groupId:artifactId:version` uniquely identifies an artifact. **`-SNAPSHOT`** versions are in-development builds that can change; release versions are immutable.

### Dependency scopes

| Scope | Compile | Test | Runtime / packaged | Example |
|---|---|---|---|---|
| `compile` (default) | ✓ | ✓ | ✓ | Spring, Jackson |
| `provided` | ✓ | ✓ | ✗ (container supplies it) | servlet API on an external app server, Lombok |
| `runtime` | ✗ | ✓ | ✓ | JDBC drivers |
| `test` | ✗ | ✓ | ✗ | JUnit, Mockito, Testcontainers |
| `import` | - | - | - | importing a BOM into `dependencyManagement` |

### dependencyManagement and BOMs

`dependencyManagement` declares **versions** for dependencies without adding them. A **BOM** (bill of materials) is a POM that only manages versions for a family of libraries that must match (Spring Boot, Testcontainers, AWS SDK). Import a BOM and declare dependencies without versions, consistent, compatible versions everywhere.

### Plugins

Maven itself does little; **plugins** do the work: compiler, surefire (unit tests), failsafe (integration tests), jar, spring-boot (repackage, run), jacoco (coverage), enforcer (rules like "no duplicate classes", required Java version), versions (find updates).

### Profiles

Activate variations by flag (`-Pci`), environment or OS. Use them for build variations, not for environment configuration, runtime config belongs in Spring profiles and environment variables.

## The build lifecycle

The default lifecycle's main phases, in order:

`validate → compile → test-compile → test → package → verify → install → deploy`

Running a phase runs all earlier phases. Plugin goals are bound to phases (surefire:test to `test`, jar:jar to `package`). Common commands:

```bash
mvn clean verify          # full build with unit + integration tests (CI)
mvn spring-boot:run       # run the app
mvn dependency:tree       # see transitive dependencies
mvn -pl orders-api -am package   # build one module and what it depends on
mvn versions:display-dependency-updates
```

Use the **Maven Wrapper** (`./mvnw`) committed to the repo so everyone uses the same Maven version.

## Repositories

- **Local repository** `~/.m2/repository` caches downloaded artifacts and `install`ed builds.
- **Remote repositories:** Maven Central, plus your company's **Nexus/Artifactory** (a proxy cache and host for internal libraries). Configure mirrors and credentials in `~/.m2/settings.xml`, not in the POM.

## Transitive dependencies and conflicts

Your dependencies have dependencies. When two paths need different versions of the same library, Maven uses **nearest wins** (shortest path in the tree; first declared on ties), which can silently pick an old version and cause `NoSuchMethodError` at runtime. Fix by pinning versions in `dependencyManagement`, using `<exclusions>`, and checking `mvn dependency:tree`. The enforcer plugin's dependency-convergence rule catches conflicts early.

## Multi-module projects

```xml
<!-- root pom.xml -->
<packaging>pom</packaging>
<modules>
  <module>orders-domain</module>
  <module>orders-api</module>
  <module>orders-worker</module>
</modules>
```

The root (aggregator/parent) POM shares versions and plugin config; modules depend on each other by coordinates. Maven builds them in dependency order (the *reactor*).

## Gradle in brief

Gradle uses a Kotlin or Groovy DSL, incremental builds and a build cache, often faster for large projects; Android uses it exclusively.

```kotlin
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "3.4.1"
    id("io.spring.dependency-management") version "1.1.7"
}
java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    runtimeOnly("org.postgresql:postgresql")
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}
```

| Maven | Gradle |
|---|---|
| `compile` scope | `implementation` (or `api` for libraries exposing types) |
| `runtime` | `runtimeOnly` |
| `provided` | `compileOnly` |
| `test` | `testImplementation` |
| phases | tasks (`build`, `test`, `bootJar`) |
| `./mvnw` | `./gradlew` |

> [!RECAP]
> - Standard layout; `pom.xml` = parent, coordinates, properties, dependencies, dependencyManagement/BOMs, plugins, profiles.
> - Scopes: compile, provided, runtime, test, import.
> - Lifecycle phases run in order; plugins bound to phases do the work.
> - `~/.m2` caches; Nexus/Artifactory proxies; settings.xml holds credentials.
> - Nearest-wins conflict resolution → pin with BOMs, inspect `dependency:tree`.
> - Multi-module builds; Gradle equivalents with build.gradle.kts.

> [!INTERVIEW] "What's in a pom.xml?", "dependencyManagement vs dependencies?", "What is a BOM?", "Explain Maven scopes", "How does Maven resolve version conflicts?", "What does mvn install do?", "Maven vs Gradle?"

::quiz {"q": "What does dependencyManagement do?", "options": ["Adds dependencies to the classpath", "Pins versions for dependencies (declared elsewhere) without adding them", "Downloads plugins", "Runs tests"], "answer": 1, "explain": "Modules then declare dependencies without versions."}

::quiz {"q": "Which scope fits a JDBC driver used only at runtime?", "options": ["compile", "provided", "runtime", "test"], "answer": 2, "explain": "Not needed to compile your code."}

::quiz {"q": "You run `mvn package`. Which phases run?", "options": ["Only package", "validate, compile, test-compile, test, package", "install and deploy", "clean and package"], "answer": 1, "explain": "A phase runs all earlier phases."}
