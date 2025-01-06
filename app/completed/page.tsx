"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/supabaseClient";
import Link from "next/link";
import Image from "next/image";

// Suppose you have a similar Whiteboards type
interface Whiteboard {
  id: string;
  image_url: string;
  status: string;
  created_at: string;
}

export default function CompletedPage() {
  const supabase = createClient();
  const [whiteboards, setWhiteboards] = useState<Whiteboard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompleted = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        console.error("No user session found. Please log in.");
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // Option A: RPC approach
      const { data, error } = await supabase.rpc("get_labeled_whiteboards", {
        user_id: userId,
      });

      if (error) {
        console.error("Error fetching labeled whiteboards:", error);
      } else if (data) {
        
        setWhiteboards(data);
      }
      setLoading(false);
    };

    fetchCompleted();
  }, [supabase]);

  if (loading) {
    return <h1>Loading completed whiteboards...</h1>;
  }

  if (whiteboards.length === 0) {
    return <h1>No labeled whiteboards found yet!</h1>;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold text-center mb-8 mt-3">
        Completed Whiteboards
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {whiteboards.map((wb) => (
          <div key={wb.id} className="border border-gray-300 rounded-lg shadow-md p-3">
            <Link
              href={`/completed/${wb.id}`}
              className="block mt-4 text-center hover:bg-slate-100 text-white py-2 px-4 rounded"
            >
              <Image
                src={wb.image_url}
                alt={`Whiteboard ${wb.id}`}
                height={500}
                width={500}
                priority
                className="w-full h-48 object-cover rounded"
              />
            </Link>
            <h2 className="text-xs p-2">
              <b>Whiteboard Id:</b> {wb.id}
            </h2>
          </div>
        ))}
      </div>
    </div>
  );
}
