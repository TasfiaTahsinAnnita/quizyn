import { Button } from "@/components/Button";
import Link from "next/link";
import "./dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard_container">
      <header className="dashboard_header">
        <h1 className="logo_small">Quizzy!</h1>
        <div className="user_profile">
          <span>Welcome, Host</span>
          <Button variant="red">Logout</Button>
        </div>
      </header>

      <main className="dashboard_main">
        <div className="dashboard_actions">
          <h2>My Quizzes</h2>
          <Link href="/dashboard/create">
            <Button variant="secondary">+ Create New Quiz</Button>
          </Link>
        </div>

        <div className="quiz_grid">
          {/* This will be populated from MySQL later */}
          <div className="empty_state">
            <p>You haven't created any quizzes yet.</p>
            <Button variant="primary">Create your first quiz</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
