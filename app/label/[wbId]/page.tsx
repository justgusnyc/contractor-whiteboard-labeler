"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/supabaseClient";
import { Chunks, Whiteboards } from "@/utils/types/types";
import Image from "next/image";

// Utility to debounce any function (basic version)
function debounce<F extends (...args: Parameters<F>) => void>(
  fn: F,
  delay = 100
): (...args: Parameters<F>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<F>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}


export default function LabelPage() {
  const { wbId } = useParams();
  const supabase = createClient();
  const router = useRouter();

  // The whiteboard data from the DB
  const [whiteboard, setWhiteboard] = useState<Whiteboards | null>(null);
  // Final chunks (each with normalized coords)
  const [chunks, setChunks] = useState<Chunks[]>([]);
  // Temporary chunk (raw screen coords) before normalization
  const [currentChunk, setCurrentChunk] = useState<Partial<Chunks> | null>(null);
  // Hover tracking in raw screen coords (for drawing the dashed preview box)
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState("");

  // Loading states (optional)
  const [isFetchingWhiteboard, setIsFetchingWhiteboard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // We'll measure the container size to do normalization
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Debounced measure function
  const measureContainer = debounce(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize({ width: rect.width, height: rect.height });
  }, 150);

  // Log currentChunk for debugging
  useEffect(() => {
    console.log("current chunk: ", currentChunk);
  }, [currentChunk]);

  // Fetch the whiteboard data on mount
  useEffect(() => {
    async function fetchWhiteboard() {
      try {
        setIsFetchingWhiteboard(true);
        const { data, error } = await supabase
          .from("whiteboards")
          .select("*")
          .eq("id", wbId)
          .single();

        if (error) {
          setError("Error fetching whiteboard.");
          console.error("Error:", error.message);
          return;
        }
        setWhiteboard(data);
      } catch (err) {
        console.error("Unexpected error fetching whiteboard:", err);
        setError("Unexpected error fetching whiteboard.");
      } finally {
        setIsFetchingWhiteboard(false);
      }
    }

    fetchWhiteboard();
  }, [wbId, supabase]);

  // Measure the container size once the component (and image) is rendered
  useEffect(() => {
    measureContainer(); // initial measure
    window.addEventListener("resize", measureContainer);
    return () => window.removeEventListener("resize", measureContainer);
  }, [measureContainer]);

  // --- Helper to convert raw screen coords -> normalized coords
  // we normalize so the values are better for training and consistent no matter the screen sz.
  const toNormalized = (screenX: number, screenY: number) => {
    // Avoid division by zero if containerSize hasn't been measured yet
    const w = containerSize.width || 1;
    const h = containerSize.height || 1;
    return {
      x: screenX / w,
      y: screenY / h,
    };
  };

  // --- Helper to convert normalized coords -> raw screen coords
  const toScreen = (normX: number, normY: number) => {
    return {
      x: normX * containerSize.width,
      y: normY * containerSize.height,
    };
  };

  // Handle user clicking the container
  const handleImageClick = (e: React.MouseEvent) => {
    if (!containerRef.current || !whiteboard) return;

    // Where did they click in the container? (raw screen coords)
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!currentChunk) {
      // First click starts a new chunk
      console.log("Starting chunk: ", { x, y });
      setCurrentChunk({ x_min: x, y_min: y });
      setHoverCoords(null); // Clear hover preview
    } else if (
      currentChunk.x_min !== undefined &&
      currentChunk.y_min !== undefined
    ) {
      // Second click ends the rectangle
      console.log("Ending coordinates: ", { x, y });
      setCurrentChunk((prev) => ({
        ...prev,
        x_max: x,
        y_max: y,
      }));
      setHoverCoords(null); // Clear hover preview
    }
  };

  // As we move the mouse, we only update the hover preview if the user is currently drawing a chunk
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !currentChunk) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setHoverCoords({ x, y });
  };

  // Finalize the chunk (normalize coords, store in `chunks`)
  const handleSaveCurrentChunk = async () => {
    if (
      !currentChunk ||
      currentChunk.x_min === undefined ||
      currentChunk.y_min === undefined ||
      currentChunk.x_max === undefined ||
      currentChunk.y_max === undefined ||
      !currentChunk.transcription ||
      !currentChunk.confidence
    ) {
      alert("Please complete the chunk before saving (missing fields).");
      return;
    }

    // Check if user is logged in
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user?.id) {
      setError("No user ID found. Please log in.");
      return;
    }

    // Convert raw screen coords -> normalized
    const { x: xMinNorm, y: yMinNorm } = toNormalized(
      currentChunk.x_min,
      currentChunk.y_min
    );
    const { x: xMaxNorm, y: yMaxNorm } = toNormalized(
      currentChunk.x_max,
      currentChunk.y_max
    );

    // Build the final chunk object with normalized coords
    const completedChunk: Chunks = {
      // let DB auto-generate id, so omit "id"
      whiteboard_id: whiteboard?.id || "",
      user_id: userData.user.id,
      // Ensure min < max if user clicked in "reverse" order
      x_min: Math.min(xMinNorm, xMaxNorm),
      y_min: Math.min(yMinNorm, yMaxNorm),
      x_max: Math.max(xMinNorm, xMaxNorm),
      y_max: Math.max(yMinNorm, yMaxNorm),
      transcription: currentChunk.transcription,
      confidence: currentChunk.confidence,
      created_at: new Date().toISOString(),
    };

    setChunks((prev) => [...prev, completedChunk]);
    setCurrentChunk(null);
  };

  // Update the text fields in the current chunk
  const handleUpdateCurrentChunk = (key: string, value: string) => {
    setCurrentChunk((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Save the chunks to Supabase
  const handleSave = async () => {
    if (chunks.length === 0) {
      setError("Please create at least one chunk before saving.");
      return;
    }

    try {
      setIsSaving(true);
      const { error } = await supabase.from("chunks").insert(chunks);
      if (error) throw error;

      alert("Chunks saved successfully!");
      setChunks([]);

      // Attempt to fetch the next whiteboard
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        setError("No user ID found. Please log in.");
        return;
      }
      const { data: nextWhiteboard, error: nextError } = await supabase.rpc(
        "get_unlabeled_whiteboards",
        {
          user_id: userData.user.id,
          limit_results: 1,
        }
      );

      if (nextError) {
        console.error("Error fetching next whiteboard:", nextError.message);
        router.push("/");
        return;
      }

      if (nextWhiteboard?.length) {
        router.push(`/label/${nextWhiteboard[0].id}`);
      } else {
        router.push("/");
      }
    } catch (err) {
      const error = err as Error
      console.error("Error saving chunks:", error.message);
      setError("Error saving chunks.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearChunks = () => {
    setChunks([]);
    setCurrentChunk(null);
    setHoverCoords(null);
  };

  // --- Utility to build style for the preview or completed chunk (given raw coords)
  const getRawBoxStyle = (
    xMinRaw: number,
    yMinRaw: number,
    xMaxRaw: number,
    yMaxRaw: number
  ) => {
    const left = Math.min(xMinRaw, xMaxRaw);
    const top = Math.min(yMinRaw, yMaxRaw);
    const width = Math.abs(xMaxRaw - xMinRaw);
    const height = Math.abs(yMaxRaw - yMinRaw);

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  // --- Utility to build style from normalized coords (for completed chunks)

  const getNormalizedBoxStyle = (
    xMinNorm: number,
    yMinNorm: number,
    xMaxNorm: number,
    yMaxNorm: number
  ) => {
    const screenMin = toScreen(xMinNorm, yMinNorm);
    const screenMax = toScreen(xMaxNorm, yMaxNorm);
    return getRawBoxStyle(screenMin.x, screenMin.y, screenMax.x, screenMax.y);
  };

  return (
    <div>
      <h1 className="text-center text-xl py-5">
        <b>Label Whiteboard:</b> {whiteboard?.id || "Loading..."}
      </h1>
      {error && <p className="text-red-500">{error}</p>}

      {/* Optional: show a loading spinner or text while fetching whiteboard */}
      {isFetchingWhiteboard && (
        <div className="text-center mb-3 text-blue-500 font-bold">Loading whiteboard...</div>
      )}

      <div className="flex flex-col">
        {/* Image Container */}
        <div
          className="relative mx-auto max-w-4xl border"
          style={{ width: "100%", height: "500px" }}
          ref={containerRef}
          onClick={handleImageClick}
          onMouseMove={handleMouseMove}
        >
          {whiteboard?.image_url ? (
            <Image
              src={whiteboard.image_url}
              alt={`Whiteboard ${wbId}`}
              className="object-contain"
              layout="fill"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              onDragStart={(e) => e.preventDefault()}
            />
          ) : (
            // Fallback if there's no image URL
            <div className="flex mx-auto justify-center">
              <p className="mx-auto self-center w-full p-5">No whiteboard found.</p>
            </div>
          )}

          {/* Hover or Finalized Chunk Preview (while user is mid-draw) */}
          {currentChunk &&
            currentChunk.x_min !== undefined &&
            currentChunk.y_min !== undefined && (
              <div
                className="absolute border border-dashed border-gray-500 bg-gray-200 bg-opacity-20 pointer-events-none"
                style={
                  currentChunk.x_max !== undefined && currentChunk.y_max !== undefined
                    ? getRawBoxStyle(
                        currentChunk.x_min,
                        currentChunk.y_min,
                        currentChunk.x_max,
                        currentChunk.y_max
                      )
                    : // If we haven't done the second click yet, preview up to hoverCoords
                      getRawBoxStyle(
                        currentChunk.x_min,
                        currentChunk.y_min,
                        hoverCoords?.x ?? currentChunk.x_min,
                        hoverCoords?.y ?? currentChunk.y_min
                      )
                }
              />
            )}

          {/* Completed Chunks (drawn from normalized coords) */}
          {chunks.map((chunk, index) => (
            <div
              key={index}
              className={`absolute border border-blue-500 ${chunk.confidence === "High" ? "bg-green-500" : chunk.confidence === "Medium" ? "bg-orange-500": "bg-red-500"} bg-opacity-30 pointer-events-none`}
              style={getNormalizedBoxStyle(
                chunk.x_min,
                chunk.y_min,
                chunk.x_max,
                chunk.y_max
              )}
            />
          ))}
        </div>
        <div className="flex max-w-lg mx-auto mt-3 text-center">
          <p className="text-xs italic font-semibold">
            Instructions: 1st click is for the first corner of the chunk. Look at
            the preview and select the 2nd corner. Then transcribe and save that
            chunk. Continue until all chunks are transcribed, then click Save & Next.
            If you made a mistake either clear your current chunk or all of them and start again!
          </p>
        </div>

        {/* Transcription/Confidence inputs */}
        <div className="ml-4">
          {currentChunk && (
            <div className="bg-white p-4 shadow-md border rounded mt-4 max-w-md mx-auto">
              <h3 className="text-lg mb-2">Chunk Details</h3>
              <input
                type="text"
                placeholder="Transcription"
                className="border p-2 w-full mb-2"
                value={currentChunk.transcription || ""}
                onChange={(e) => handleUpdateCurrentChunk("transcription", e.target.value)}
              />
              <select
                className="border p-2 w-full mb-2"
                value={currentChunk.confidence || ""}
                onChange={(e) => handleUpdateCurrentChunk("confidence", e.target.value)}
              >
                <option value="">Confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                className="bg-green-400 text-white px-4 py-2 rounded-lg w-full hover:bg-green-200"
                onClick={handleSaveCurrentChunk}
              >
                Save Chunk
              </button>
              <button
                onClick={() => {
                  setCurrentChunk(null);
                }}
                className="mt-2 text-white bg-red-400 w-full px-4 py-2 rounded-lg hover:bg-red-200"
              >
                Clear Current Chunk
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-between mx-auto max-w-md">
        <button
          onClick={handleClearChunks}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-200"
        >
          Clear All
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`${
            isSaving ? "bg-gray-400" : "bg-green-500 hover:bg-green-200"
          } text-white px-4 py-2 rounded-lg`}
        >
          {isSaving ? "Saving..." : "Save & Next"}
        </button>
      </div>
    </div>
  );
}
