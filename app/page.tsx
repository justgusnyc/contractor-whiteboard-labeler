"use client";
import { createClient } from "@/utils/supabase/supabaseClient";
import { Whiteboards } from "@/utils/types/types";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [whiteboards, setWhiteboards] = useState<Whiteboards[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // NEW: Local state to track whether CSV export is in progress
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    // in our use effect, we will fetch the whiteboards when the user enters the page
    const fetchWhiteboards = async () => {
      setLoading(true);

      // Check user session
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Error fetching session: ", sessionError);
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Fetch whiteboards that the user hasn't labeled yet (RPC)
      const { data, error } = await supabase.rpc("get_unlabeled_whiteboards", {
        user_id: userId,
      });

      if (error) {
        console.error("Error fetching whiteboards: ", error);
      } else {
        setWhiteboards(data || []);
      }

      setLoading(false);
    };

    fetchWhiteboards();
  }, [supabase]);

  // NEW: function to export user-labeled chunks to CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);

      // 1) Ensure user is logged in
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        alert("No user session found. Please log in first.");
        return;
      }
      const userId = session.user.id;

      // 2) Fetch chunks for that user, joined with whiteboard image_url
      //    Using Supabase foreign table reference syntax: whiteboards!inner(image_url)
      //    Which means: join the "whiteboards" table via the foreign key whiteboard_id,
      //    and select "image_url" from that row.
      const { data: chunksData, error } = await supabase
        .from("chunks")
        .select(`
          id,
          whiteboard_id,
          user_id,
          x_min,
          y_min,
          x_max,
          y_max,
          transcription,
          confidence,
          created_at,
          whiteboards!inner(image_url)
        `)
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching chunks for CSV:", error.message);
        return;
      }

      if (!chunksData || chunksData.length === 0) {
        alert("No labeled chunks found for this user!");
        return;
      }

      // 3) Build CSV string
      //    Choose whichever columns you want, in any order.
      //    We'll flatten "whiteboards.image_url" into just "image_url".
      const headers = [
        "id",
        "whiteboard_id",
        "user_id",
        "x_min",
        "y_min",
        "x_max",
        "y_max",
        "transcription",
        "confidence",
        "created_at",
        "image_url",
      ];

      // Start with the header row
      const csvRows = [headers.join(",")];

      // For each chunk, build a row
      for (const chunk of chunksData) {
        // chunk.whiteboards is an object, e.g. { image_url: '...' }
        const row = [
          chunk.id,
          chunk.whiteboard_id,
          chunk.user_id,
          chunk.x_min,
          chunk.y_min,
          chunk.x_max,
          chunk.y_max,
          chunk.transcription ?? "",
          chunk.confidence ?? "",
          chunk.created_at ?? "",
          // @ts-expect-error: Supabase returns joined data (whiteboards.image_url) that is not typed in the Chunks interface
          chunk.whiteboards?.image_url ?? "", // Flatten the joined data
        ];
        // Convert row elements to a comma-separated string
        csvRows.push(
          row
            .map((val) => {
              const escaped = String(val).replace(/"/g, '""'); // Escape double quotes so if the value has quotes it won't mess stuff up
              return `"${escaped}"`; 
            })
            .join(",")
        );
      }

      const csvContent = csvRows.join("\n");

      // 4) Create a downloadable blob and trigger browser download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "my_chunks.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error exporting CSV:", err);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
        <h1>Loading...</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-center mb-8 mt-3">
        Unlabeled Whiteboards
      </h1>

      {/* CSV Export Button */}
      <div className="flex justify-center">
        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="max-w-md align-center text-center w-full mb-3 border border-gray-400 rounded-lg p-1 hover:bg-gray-600 hover:text-white shadow-md"
        >
          {exporting ? "Exporting..." : "Export to CSV"}
        </button>
      </div>

      {/* Whiteboard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {whiteboards.length === 0 ? (
          <p className="text-center col-span-3">
            🎉 All whiteboards have been labeled. Great work!
          </p>
        ) : (
          whiteboards.map((whiteboard) => (
            <div
              key={whiteboard.id}
              className="border border-gray-300 rounded-lg shadow-md p-3"
            >
              <Link
                href={`/label/${whiteboard.id}`}
                className="block mt-4 text-center hover:bg-slate-100 text-white py-2 px-4 rounded"
              >
                <Image
                  src={whiteboard.image_url}
                  alt={`Whiteboard ${whiteboard.id}`}
                  height={500}
                  width={500}
                  priority
                  className="w-full h-48 object-cover rounded"
                />
              </Link>
              <h2 className="text-xs p-2">
                <b>Whiteboard Id:</b> {whiteboard.id}
              </h2>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
