export type Whiteboards = {
    id: string;
    image_url: string;
    status: string;
    created_at: string;
};

export type Users = {
    id: string;
    email: string;
    created_at: string;
}

export type Chunks = {
    id?: string;
    whiteboard_id: string;
    user_id: string;
    x_min: number;
    y_min: number;
    x_max: number;
    y_max: number;
    transcription: string;
    confidence: string;
    created_at: string;
}