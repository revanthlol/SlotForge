The `.puml` files are sufficient because they contain the classes, entities, relationships, multiplicities, components and deployment flow. The SVGs would only be needed to check the final layout or arrow readability.

Here is a faculty-ready script. Shritha’s three sections are intentionally left blank.

# SlotForge UML Diagrams — Weekly Review Script

## Introduction

Good morning, ma’am/sir.

For this week’s review, we have prepared six diagrams for our mini-project, **SlotForge**. SlotForge is a timetable-generation system that helps institutions manage academic data and automatically generate timetables while considering constraints such as teacher availability, room capacity, subject hours and scheduling clashes.

The six diagrams we have prepared are:

1. Use-case diagram
2. Activity diagram
3. Class diagram
4. Entity-Relationship diagram
5. Sequence diagram
6. Deployment diagram

We have divided the explanation between us. Shritha will explain the **use-case, activity and sequence diagrams**, while I will explain the **class, ER and deployment diagrams**.

---

# 1. Use-Case Diagram

### Explained by Shritha

---

# 2. Activity Diagram

### Explained by Shritha

---

# 3. Class Diagram

### Explained by Revanth

The class diagram represents the **object-oriented structure of SlotForge**. It shows the major classes in the system, the information stored by each class and the relationships between them.

[Point towards the `User` and `Workspace` classes.]

The first major class is the **User** class. It stores basic details such as the user ID, name and role.

A user can manage zero or more workspaces. A **Workspace** represents the main working environment for a particular institution, department or academic year. It contains details such as the workspace name and academic year.

[Point towards the academic-resource classes.]

Each workspace contains the academic resources required for timetable generation. These include:

* Teachers
* Subjects
* Sections
* Rooms
* Time slots
* Constraints

The **Teacher** class stores the teacher’s name and availability.

The **Subject** class stores the subject name and the number of hours that must be scheduled every week.

The **Section** class represents a student group or class and stores details such as its name and student count.

The **Room** class stores the room name and capacity.

The **TimeSlot** class represents a particular day and period during which a class can be scheduled.

The **Constraint** class stores the scheduling rules. Each constraint has a name, type, priority and enabled status. Examples include teacher availability, room capacity, required weekly subject hours and prevention of timetable clashes.

[Point towards `TimetableEntry`.]

The central class in the generated timetable is the **TimetableEntry** class.

Each timetable entry represents one scheduled class. It connects:

* One teacher
* One subject
* One section
* One room
* One time slot

For example, one timetable entry might represent a specific teacher handling a particular subject for a section in a selected room during a particular period.

One teacher, subject, section, room or time slot can be associated with several timetable entries. However, every individual timetable entry refers to one of each of these resources.

[Point towards `TimetableVersion`.]

The **TimetableVersion** class represents a complete generated timetable. It stores the timetable label, version number, status and creation time.

A timetable version contains one or more timetable entries. This is shown using a **composition relationship**.

Composition is used because timetable entries are part of a particular timetable version and normally do not have an independent meaning without that version.

The versioning system allows SlotForge to preserve different generated or edited versions instead of replacing the previous timetable immediately.

[Point towards `Scheduler` and `ScheduleRun`.]

The **Scheduler** class contains the main timetable-generation logic.

It performs two important operations:

* `generateTimetable()`
* `checkConstraints()`

The scheduler uses information about teachers, subjects, sections, rooms and time slots. It also checks the configured constraints before assigning them to timetable entries.

Every attempt to generate a timetable is represented by the **ScheduleRun** class. It records the status of the run, when it started and how long the generation process took.

A schedule run may successfully produce a timetable version. It may also return an infeasible status when the available resources and constraints make timetable generation impossible.

[Point towards `ExportService`.]

Finally, the **ExportService** class is responsible for exporting the generated timetable.

It can export the timetable in formats such as:

* PDF
* Excel
* Calendar format

Therefore, the class diagram gives us a complete structural view of the main objects in SlotForge and explains how they interact with each other.

---

# 4. Entity-Relationship Diagram

### Explained by Revanth

The Entity-Relationship diagram represents the **database structure of SlotForge**.

While the class diagram explains the software objects and their behaviour, the ER diagram explains how the data is organised and stored inside the database.

[Point towards the entity attributes.]

Each entity is represented as a database table.

The field marked as **PK** is the primary key. It uniquely identifies each record in a table.

The fields marked as **FK** are foreign keys. They connect one table with another table and help maintain relationships between the data.

[Point towards `users` and `workspaces`.]

The **users** table stores the user ID, name and role.

The **workspaces** table stores the workspace details. It contains an `owner_id` foreign key, which connects the workspace to the user who owns it.

One user can own multiple workspaces, while each workspace belongs to one user.

[Point towards the academic-data entities.]

The workspace contains the main academic information required by SlotForge:

* Teachers
* Subjects
* Sections
* Rooms
* Time slots
* Constraints

The **teachers** table stores teacher details and availability.

The **subjects** table stores subject information and the required weekly hours.

The **sections** table stores section names and student counts.

The **rooms** table stores room names and capacities.

The **timeslots** table stores the available days and periods.

The **constraints** table stores the rules used during timetable generation, including their priority and whether they are currently enabled.

[Point towards `schedule_runs`.]

The **schedule_runs** table records each timetable-generation attempt.

It stores:

* The associated workspace
* The generation status
* The starting time
* The duration of the generation process

This is helpful for tracking successful, failed or infeasible timetable-generation attempts.

[Point towards `timetable_versions`.]

The **timetable_versions** table stores every generated version of the timetable.

It contains foreign keys referring to:

* The workspace
* The user who created it
* The schedule run that produced it

It also stores the timetable label, version number, status and creation time.

This helps maintain the version history of the timetable.

[Point towards `timetable_entries`.]

The **timetable_entries** table is the central table in the ER diagram.

Every row in this table represents one scheduled class.

It connects the timetable version with:

* A teacher
* A subject
* A section
* A room
* A time slot

Instead of repeatedly storing complete teacher, subject, section and room details, the table stores their foreign-key IDs.

This reduces duplicate data and keeps the database normalised.

[Point towards the relationship between constraints and schedule runs.]

The relationship between constraints and schedule runs shows which constraints were applied during a particular timetable-generation attempt.

For example, one schedule run may apply rules such as:

* No teacher double-booking
* Room capacity must be sufficient
* The teacher must be available
* Required weekly subject hours must be completed

Overall, the ER diagram explains how SlotForge stores its users, academic resources, constraints, generation history, timetable versions and individual timetable entries inside the PostgreSQL database.

---

# 5. Sequence Diagram

### Explained by Shritha

---

# 6. Deployment Diagram

### Explained by Revanth

The deployment diagram represents the **physical and runtime architecture of SlotForge**.

It explains where the different parts of the application are deployed and how communication takes place between the user, frontend, backend, authentication provider and database.

[Point towards `Faculty / Admin Browser`.]

The first node is the **Faculty or Admin Browser**.

The user does not need to install SlotForge locally. They can access the application using a normal web browser.

The browser opens the SlotForge web application hosted on the web-hosting platform.

[Point towards `Web Hosting`.]

The web-hosting environment contains the **React frontend**.

The frontend includes:

* HTML, CSS and JavaScript files
* The timetable user interface
* Academic data-entry forms
* Results, heatmap and export controls

The data-entry forms allow the user to enter information such as teachers, subjects, sections, rooms, time slots and constraints.

The results interface displays the generated timetable, its status, detected conflicts and available export options.

[Point towards `Backend Application Server`.]

The frontend sends HTTPS API requests to the **FastAPI backend**, which runs on the backend application server.

The backend is divided into several logical modules.

The **Authentication and Access Control module** verifies the identity and permissions of the user.

The **Workspace and Data API** handles academic information such as teachers, subjects, sections, rooms and constraints.

The **Timetable Generation API** handles timetable-generation requests.

The **Results and Export API** retrieves generated timetables and prepares them for viewing, sharing or downloading.

[Point towards the scheduler and validation service.]

The backend communicates with the **Timetable Scheduler**, which acts as the constraint solver.

The scheduler receives the validated academic data and constraints. It then attempts to assign teachers, subjects, sections, rooms and time slots without creating invalid clashes.

The generated candidate timetable is sent to the **Validation and Explanation Service**.

This service checks conditions such as:

* Teacher availability
* Teacher or room double-booking
* Room capacity
* Subject-hour requirements
* Other configured constraint violations

If a valid timetable can be produced, the system marks it as feasible and saves it.

If the constraints cannot be satisfied, the service returns an infeasible result along with an understandable explanation of the conflicts.

[Point towards the PostgreSQL database.]

SlotForge uses a **PostgreSQL database** to store the project data.

The database stores three main categories of information.

The first category is **academic data**, which includes teachers, subjects, sections and rooms.

The second category is **scheduling data**, which includes time slots, constraints and timetable entries.

The third category is **users and results**, which includes accounts, schedule runs and timetable versions.

The backend reads the scheduling inputs from the database before generation and saves the completed schedule run and timetable version after generation.

[Point towards the authentication provider.]

The system also communicates with an external **Authentication Provider**.

The frontend uses this provider for user login and session creation. The authentication provider returns a session token, and the backend verifies this token before allowing access to protected functions.

[Point towards `Optional External Services`.]

The final part contains optional external services.

The **File Download service** allows users to download the timetable as a PDF, Excel file or calendar file.

The **Public Timetable Link service** creates a view-only link that can be shared with faculty members or students.

Therefore, the complete deployment flow is:

The user opens the React frontend in the browser. The frontend sends secure API requests to the FastAPI backend. The backend verifies the user, accesses PostgreSQL, sends the scheduling data to the constraint solver, validates the generated result, saves the timetable and returns the result to the frontend.

This deployment design separates the frontend, backend, authentication, database and scheduling engine, which makes the system easier to maintain, secure and expand.

---

# Conclusion

These six diagrams represent SlotForge from different perspectives.

The **use-case diagram** represents what the users can perform in the system.

The **activity diagram** represents the flow of activities involved in using or generating a timetable.

The **class diagram** represents the object-oriented structure and relationships between the main software classes.

The **ER diagram** represents how the information is structured and stored in the database.

The **sequence diagram** represents the order of communication between the user and different system components.

Finally, the **deployment diagram** represents where each component is hosted and how the components communicate during actual execution.

Together, these diagrams help us understand the functional behaviour, internal structure, database design, communication flow and deployment architecture of SlotForge.

Thank you.

## Small corrections before presenting

Your diagrams are good overall, but these three points could be noticed by the faculty:

1. In the ER diagram, `teachers`, `subjects`, `sections`, `rooms`, `timeslots` and `constraints` are connected to a workspace, but they do not currently contain a `workspace_id` foreign key. Add one to each table if every resource belongs to a workspace.

2. The class diagram says one `ScheduleRun` produces **zero or one** timetable version, whereas the ER diagram currently allows one schedule run to produce **multiple** timetable versions. Choose one rule and keep it consistent. For SlotForge, zero or one version per run is probably simpler.

3. The constraints-to-schedule-runs relationship is many-to-many. In a physical database, this usually needs an intermediate table such as:

```text
schedule_run_constraints
- schedule_run_id
- constraint_id
```

The SVGs are not necessary for creating the script. They would only help verify that every arrow and label is clearly visible on the projected diagram.

