import Navbar from "../components/Navbar";
import Grid from "../components/Grid";
export default function LandingPage() {
  return (
    <div>
      <Navbar />
      <main className="h-screen flex items-center justify-center text-center">
        <Grid />
      </main>
      {/* <Chart /> */}
    </div>
  );
}
