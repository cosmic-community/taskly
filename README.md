# Taskly

![App Preview](https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=300&fit=crop&auto=format)

A minimal personal Trello-style Kanban board application. Single screen, no authentication, no routing. Create boards, columns, and cards with intuitive drag-and-drop functionality. All data is saved locally in your browser.

## ✨ Features

- **Multi-board Management**: Create, rename, delete, and switch between multiple boards
- **Flexible Columns**: Add, rename, reorder, and delete columns within boards
- **Rich Card System**: Create cards with titles, descriptions, labels, and due dates
- **Drag & Drop**: Intuitive drag-and-drop for cards within/across columns and column reordering
- **Local Storage**: All data persists in localStorage - no backend required
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Archive System**: Archive boards and cards instead of permanent deletion

## <!-- CLONE_PROJECT_BUTTON -->

## Prompts

This application was built using the following prompts to generate the content structure and code:

### Content Model Prompt

> No content model prompt provided - app built from existing content structure

### Code Generation Prompt

> A minimal personal Trello-style Kanban. Single screen, no auth, no routing. Create boards, columns, and cards. Drag and drop to reorder. Data saved in localStorage.

The app has been tailored to work with your existing Cosmic content structure and includes all the features requested above.

## 🛠️ Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **@dnd-kit/core** - Modern drag-and-drop library
- **@dnd-kit/sortable** - Sortable drag-and-drop utilities
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **localStorage** - Browser-based data persistence

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Modern web browser with localStorage support

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Start the development server:
   ```bash
   bun run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 Usage

### Creating Boards
- Click "New Board" to create a new Kanban board
- Enter a board name and start organizing your tasks

### Managing Columns
- Add columns using the "+ Add Column" button
- Drag column headers to reorder them
- Click the column menu (⋮) to rename or delete columns

### Working with Cards
- Click "+ Add Card" in any column to create a new task
- Drag cards between columns to update their status
- Click on any card to view/edit details, add descriptions, labels, or due dates
- Use the card menu to archive or delete cards

### Data Persistence
All your boards, columns, and cards are automatically saved to your browser's localStorage. Your data persists between sessions on the same browser and device.

## 📱 Responsive Design

Taskly is fully responsive and works great on:
- Desktop computers (optimal experience)
- Tablets (touch-friendly drag and drop)
- Mobile phones (simplified interface)

## 🔧 Customization

The app uses a clean design system with Tailwind CSS. You can easily customize colors, spacing, and components by modifying the Tailwind configuration and component styles.

## 📦 Deployment

This is a static Next.js application that can be deployed to any static hosting service:

### Vercel (Recommended)
```bash
bun run build
# Deploy to Vercel
```

### Netlify
```bash
bun run build && bun run export
# Deploy the `out` folder to Netlify
```

### Other Static Hosts
```bash
bun run build
# Deploy the `.next` folder or use `next export` for static files
```
