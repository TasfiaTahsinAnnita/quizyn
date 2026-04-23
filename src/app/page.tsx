import "./page.css";

export default function Home() {
  return (
    <main className="main_container">
      <div className="hero_section animate-fade-in">
        <h1 className="logo_text">Quizyn!</h1>
        <p className="subtitle">Real-time fun, simplified.</p>
        
        <div className="action_cards">
          <div className="card host_card">
            <h2>Host a Game</h2>
            <p>Create quizzes and challenge your friends.</p>
            <button className="btn_primary">Get Started</button>
          </div>
          
          <div className="card player_card">
            <h2>Join a Game</h2>
            <p>Enter a PIN to start playing.</p>
            <div className="input_group">
              <input type="text" placeholder="Game PIN" className="pin_input" />
              <button className="btn_secondary">Join</button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
