"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/supabaseClient";
import Image from "next/image";
import { Chunks, Whiteboards } from "@/utils/types/types";

export default function CompletedWhiteboardPage() {
  const { wbId } = useParams();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const [whiteboard, setWhiteboard] = useState<Whiteboards | null>(null);
  const [whiteboardLoading, setWhiteboardLoading] = useState(true);

  const [chunks, setChunks] = useState<Chunks[]>([]);
  const [chunksLoading, setChunksLoading] = useState(true);

  const [error, setError] = useState("");
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // For showing chunk details on click
  const [selectedChunk, setSelectedChunk] = useState<Chunks | null>(null);

  // Fetch whiteboard and chunks
  useEffect(() => {
    async function fetchData() {
      try {
        // 1) Check user
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("No user session found.");
          setWhiteboardLoading(false);
          setChunksLoading(false);
          return;
        }

        // Start both fetches at the same time
        const wbPromise = supabase
          .from("whiteboards")
          .select("*")
          .eq("id", wbId)
          .single();

        const chunksPromise = supabase
          .from("chunks")
          .select("*")
          .eq("whiteboard_id", wbId)
          .eq("user_id", session.user.id);

        // 2) Await both
        const [wbResult, chunkResult] = await Promise.all([wbPromise, chunksPromise]);

        // Whiteboard result
        if (wbResult.error) {
          setError("Error fetching whiteboard.");
          console.error(wbResult.error);
        } else {
          setWhiteboard(wbResult.data);
        }
        setWhiteboardLoading(false);

        // Chunks result
        if (chunkResult.error) {
          setError("Error fetching chunks.");
          console.error(chunkResult.error);
        } else {
          setChunks(chunkResult.data || []);
        }
        setChunksLoading(false);
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("Unexpected error occurred");
        setWhiteboardLoading(false);
        setChunksLoading(false);
      }
    }

    fetchData();
  }, [wbId, supabase]);

  function measureContainer() {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
  }

  const handleImageLoaded = () => {
    measureContainer(); // measure again after the image is definitely sized
  };

  // Measure container so we can draw bounding boxes
  // we do this because when the image first loads in it technically has no size, so we check multiple times 
  // (inluding on the image itself we call again once it's done loading) so the chunks actually load right
  useEffect(() => {
    measureContainer();
    window.addEventListener("resize", measureContainer);
    return () => window.removeEventListener("resize", measureContainer);
  }, []);

  // Helper: Convert normalized => screen coords
  const toScreen = (nx: number, ny: number) => {
    return {
      x: nx * containerSize.width,
      y: ny * containerSize.height,
    };
  };

  // Build style from chunk’s normalized coords
  const getBoxStyle = (chunk: Chunks) => {
    const { x: left1, y: top1 } = toScreen(chunk.x_min, chunk.y_min);
    const { x: left2, y: top2 } = toScreen(chunk.x_max, chunk.y_max);

    const left = Math.min(left1, left2);
    const top = Math.min(top1, top2);
    const width = Math.abs(left2 - left1);
    const height = Math.abs(top2 - top1);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      position: "absolute" as const,
    };
  };

  // Handler for bounding box click
  const handleBoxClick = (chunk: Chunks) => {
    setSelectedChunk(chunk);
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  // Show a separate loading for the whiteboard
  if (whiteboardLoading && !whiteboard) {
    return <p>Loading whiteboard...</p>;
  }

  return (
    <div>
      <h1 className="text-xl text-center p-4">
        <b>Completed Whiteboard:</b> {wbId}
      </h1>

      <div
        ref={containerRef}
        className="relative mx-auto max-w-4xl border"
        style={{ width: "100%", height: "500px" }}
      >
        {whiteboard && (
          <Image
          src={whiteboard.image_url}
          alt={`Whiteboard ${wbId}`}
          className="object-contain"
          fill
          priority
          onDragStart={(e) => e.preventDefault()}
          onLoadingComplete={handleImageLoaded}
        />
        )}

        {/* If chunks are still loading, show a small overlay or text */}
        {chunksLoading && (
          <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-white bg-opacity-75 text-black">
            <p>Loading chunks…</p>
          </div>
        )}

        {/* Draw each chunk bounding box */}
        {chunks.map((chunk) => (
          <div
            key={chunk.id}
            style={getBoxStyle(chunk)}
            className="border border-blue-500 bg-blue-200 bg-opacity-30 cursor-pointer"
            onClick={() => handleBoxClick(chunk)}
          />
        ))}
      </div>

      <div className="flex max-w-lg mx-auto mt-3 text-center">
        <p className="text-xs italic font-semibold">Click on one of the chunks to see the transcription and confidence value!</p>
      </div>

      {/* If a chunk is selected, show details */}
      {selectedChunk && (
        <div className="max-w-md mx-auto border p-4 mt-4">
          <h2 className="text-lg font-bold mb-2">Chunk Details</h2>
          <p>
            <b>Transcription:</b>{" "}
            {selectedChunk.transcription || "No transcription"}
          </p>
          <p>
            <b>Confidence:</b> {selectedChunk.confidence || "N/A"}
          </p>
          <button
            className="text-sm text-blue-500 underline mt-2"
            onClick={() => setSelectedChunk(null)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
