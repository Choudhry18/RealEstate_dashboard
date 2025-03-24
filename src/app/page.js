import Grid from "../components/Grid";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto mb-12 text-center">
          <div className="mt-8 flex justify-center gap-6">
            <Link href="https://github.com/Choudhry18/RealEstate_dashboard/blob/main/DOC.md" 
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                            transition-colors flex items-center gap-2">
              <span className="font-medium">Documentation</span>
            </Link>
            
            <Link href="/reflection" 
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg 
                            transition-colors flex items-center gap-2">
              <span className="font-medium">Reflection</span>
            </Link>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 mt-8">Analytics Dashboard</h2>
          <p className="text-slate-300 text-lg">
            Select one of the analysis options below to explore your data
          </p>
        </div>
        
        <Grid />
  
      </main>
    </div>
  );
}