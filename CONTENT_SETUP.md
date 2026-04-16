# Content Organization Setup Guide

## Overview

Your content is now organized in a folder structure that automatically displays on the site. The system reads files from organized directories and displays them based on content type (ALL, VIDEOS, IMAGES, ALBUMS).

## Folder Structure

```
public/
  content/
    videos/
      video-title-1.mp4
      video-title-2.mp4
      ...
    images/
      image-title-1.jpg
      image-title-2.jpg
      ...
    albums/
      [album-name-1]/
        photo-1.jpg
        photo-2.jpg
        video-1.mp4
      [album-name-2]/
        another-photo.jpg
        ...
```

## How to Add Content

### For Videos
Add video files directly to `public/content/videos/`:
- **Supported formats**: `.mp4`, `.webm`, `.mov`, `.avi`
- Filename becomes the title: `sexy-student-teen.mp4` → "sexy student teen"

### For Images
Add image files directly to `public/content/images/`:
- **Supported formats**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Filename becomes the title: `beautiful-blonde-summer.jpg` → "beautiful blonde summer"

### For Albums
Create a folder inside `public/content/albums/` with the album name:
- Use hyphens, underscores, or spaces (e.g., `summer-collection`, `beach_vacation`, `winter photos`)
- Add multiple photos/videos inside that folder
- The folder name becomes the album title
- All items in the folder are grouped together as an album

## Examples

### Videos
```
public/content/videos/
  morning-workout.mp4
  evening-dinner.mp4
```
Appears in the VIDEOS tab as individual video items.

### Images
```
public/content/images/
  beautiful-beach.jpg
  sunset-photo.png
```
Appears in the IMAGES tab as individual image items.

### Albums
```
public/content/albums/summer-collection/
  beach-day-1.jpg
  beach-day-2.jpg
  pool-party-video.mp4
```
Appears in the ALBUMS tab as a single album called "summer collection" containing all items.

## How It Works

1. **Automatic Detection**: The system automatically scans `public/content/videos/`, `public/content/images/`, and `public/content/albums/`
2. **File Reading**: Files are read from their respective directories
3. **Title Generation**: Filenames are automatically formatted (hyphens/underscores → spaces)
4. **Type Detection**: Files are automatically identified as images or videos
5. **Tab Filtering**: Content is filtered by tabs (ALL, VIDEOS, IMAGES, ALBUMS)
6. **Display**: Content appears on `/content` page in a grid layout

## Navigation Tabs

- **ALL**: Shows all content (videos, images, and albums)
- **VIDEOS**: Shows only video files from `public/content/videos/`
- **IMAGES**: Shows only image files from `public/content/images/`
- **ALBUMS**: Shows album folders from `public/content/albums/` (each folder is an album)

## API Endpoints

- `GET /api/content/all?type=[all|videos|images|albums]` - Get content filtered by type
- `GET /api/content/girls?album=[name]` - Get content from a specific album

## Features

- ✅ Automatic file detection
- ✅ Image and video support
- ✅ Automatic title generation from filenames
- ✅ Video indicators (camera icon)
- ✅ View counts (currently randomized, can be updated to track real views)
- ✅ Responsive grid layout (up to 6 columns)
- ✅ Dark theme with pink accents matching reference design

## Notes

- For albums, the first image found becomes the album's thumbnail
- Views are currently randomized (can be updated to track real views in the future)
- Files are sorted alphabetically by title
- The system automatically handles file type detection
- Albums can contain both images and videos mixed together

## Troubleshooting

**Content not showing?**
- Make sure files are in the correct directory:
  - Videos: `public/content/videos/`
  - Images: `public/content/images/`
  - Albums: `public/content/albums/[album-name]/`
- Check that file extensions are supported
- Restart the dev server after adding new files
- Check browser console for errors
- Make sure you're on the correct tab (ALL, VIDEOS, IMAGES, or ALBUMS)

**Titles not displaying correctly?**
- Use descriptive filenames with hyphens or underscores
- Avoid special characters in filenames
- The system converts hyphens/underscores to spaces automatically
- Album folder names are also formatted for display

