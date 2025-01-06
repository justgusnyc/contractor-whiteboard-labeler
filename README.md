# Real-Time Whiteboard Transcription Labeling System

This project is a labeling interface designed to help contractors break down and transcribe whiteboards to create high-quality training data for AI models. Focused on user experience, the system allows contractors to label whiteboard chunks, assess their legibility, and export their transcriptions into CSV files.

## General Idea

The goal of this project is to provide an efficient and user-friendly tool for contractors to label mathematical whiteboards. By accurately transcribing and assessing the confidence level of different sections, the system generates ground truth data for training AI models. Users can:

- Label whiteboard chunks with transcriptions and confidence levels (high, medium, or low).
- Export completed transcriptions as CSV files to share with their employers or AI models.
- View and manage their past transcriptions.

The primary focus is to maintain a smooth user experience while ensuring data consistency and quality.

## Challenges

1. **Bounding Boxes and UX**: Ensuring that bounding boxes behaved predictably when selecting chunks was crucial for a good user experience. This included:
   - Efficient previews of selected chunks.
   - Normalized and reflexive data for consistent resizing and display.

2. **Data Consistency**: Guaranteeing that chunk data remained consistent across different resolutions and scenarios was critical for both training purposes and usability.

3. **Flow Optimization**: The transcription process was streamlined to:
   - Save chunks properly.
   - Allow users to provide confidence levels seamlessly.
   - Ensure an intuitive and efficient workflow.

## Process

1. **Authentication and Login**: Implemented a simple authentication system to track contractors’ progress and ensure secure access.
2. **Home Page**: Built a home page to display the list of whiteboards available for labeling.
3. **Whiteboard Editing**: Added functionality for users to:
   - Edit and label whiteboards.
   - Save their progress efficiently.
4. **Export Functionality**: Created an export feature for users to download completed transcriptions as CSV files.
5. **Past Transcriptions**: Added a flow for users to view and manage previously completed transcriptions.
6. **Documentation**: Tried to add comments that would help understand the code as well as write up this document here to answer any potential questions :)

## Disclaimers

- This project focuses on building a functional MVP and may not handle edge cases comprehensively.
- Bounding box interactions were optimized for common use cases but may require additional tuning for edge scenarios.
- The export feature assumes well-formed data and may need additional validation for larger datasets.

## Getting Started

To run the project locally, follow these steps:

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-folder>
```
2. Install dependencies:

npm install

3. Run the development server:

npm run dev

4. Open http://localhost:3000 in your browser to see the app. 

(You should just be able to check the Vercel deployment to play around with it though)

## Features:
- Chunk Labeling: Select, label, and assess chunks of whiteboards.

- Confidence Levels: Mark chunks as high, medium, or low confidence.

- Data Export: Download labeled data as CSV files for further processing.

- Authentication: Track contractor progress and ensure secure access.

- Responsive Design: Consistent and intuitive experience across different screen sizes.

- View Completed Transcriptions: Easily review and manage previously labeled data.
