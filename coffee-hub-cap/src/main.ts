import './styles.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="shell">
      <section class="card">
        <div class="orb"></div>
        <div class="card-content">
          <p class="eyebrow">Coffee Hub</p>
          <h1>Android Shell Ready</h1>
          <p>
            This local shell exists for native branding, splash resources, and offline recovery.
            The live app loads from the deployed Vercel URL inside Capacitor.
          </p>
        </div>
      </section>
    </main>
  `;
}
