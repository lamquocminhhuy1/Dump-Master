# Dumps Learning App Walkthrough

I have upgraded the Dumps Learning Web App to a **Full-Stack Application** with a **ServiceNow University-inspired Design**.

## New Features
- **Visual Overhaul**: A professional Navy and Blue theme matching ServiceNow's aesthetic.
- **Hero Dashboard**: A prominent hero section highlighting the course.
- **Card Layout**: Redesigned dump cards with cover images and clear metadata.
- **User Profiles**: Upload an avatar and set a bio in the new Profile page.
- **Public Library**: Share your dumps with everyone or keep them private.
- **Quiz Timer**: Set a time limit for your dumps to simulate real exams.
- **Dark/Light Mode**: Toggle between themes using the icon in the navigation bar.

## How to Run (Docker)
1.  **Build and Run**:
    ```bash
    docker-compose up --build -d
    ```
2.  **Access**:
    Open `http://localhost:3000` (or your VPS IP:3000).

## User Guide
### Profile Management
1.  Click your avatar in the top right corner.
2.  Select **Profile**.
3.  Upload a new avatar or update your bio.

### Creating & Sharing Dumps
1.  **Upload**: Click "Add New Dump" on the Dashboard.
2.  **Edit**: Click the **Edit** (pencil) icon on a dump card.
3.  **Settings**:
    - **Visibility**: Set to **Public** to share with everyone.
    - **Timer**: Set a time limit (in minutes) for the quiz.
4.  **Public Library**: Switch to the "Public Library" tab on the Dashboard to see dumps shared by others.

### Taking a Quiz
1.  Click **View** on any dump card.
2.  If a timer is set, a countdown will appear in the header.
3.  The quiz will auto-submit when time runs out.

## Admin Access
The first user registered is the **Admin**.
- Admins can delete any dump (even private ones from other users).
- Admins can manage users via the Admin Dashboard.

## Data Persistence
Data is stored in the `data/` folder and uploads in `uploads/`. Back up these folders to save your data.
