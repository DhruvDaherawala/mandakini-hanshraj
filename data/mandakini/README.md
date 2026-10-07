# Mandakini Data and Media Architecture

This directory and the corresponding `public/mandakini` assets folder store the structured product collections and media for Mandakini.

## Folder Organization

```
public/mandakini/
├── hero.webp                      # Main storefront hero banner
├── categories/                    # Collection cover images organized by category slug
│   ├── sarees/
│   │   └── sarees-collection.webp
│   ├── suits-kurtis/
│   │   └── suits-kurtis-collection.webp
│   ├── lehengas/
│   │   └── lehengas-collection.webp
│   ├── dupattas-scarves/
│   │   └── dupattas-collection.webp
│   ├── fabrics/
│   │   └── fabrics-collection.webp
│   └── accessories/
│       └── accessories-collection.webp
└── products/                      # Product photography organized by category slug
    ├── sarees/
    │   └── banarasi-katan-silk-saree.webp
    ├── suits-kurtis/
    │   └── chanderi-embroidered-anarkali.webp
    ├── lehengas/
    │   └── heritage-bridal-lehenga.webp
    ├── dupattas-scarves/
    │   └── jamdani-silk-dupatta.webp
    ├── fabrics/
    │   └── chanderi-brocade-fabric.webp
    └── accessories/
        └── zardozi-embroidered-potli.webp

public/uploads/                    # Automatic storage for admin-uploaded photos
```

## MongoDB Synchronization

All images referenced by categories, products, content, and settings are validated and tracked in the MongoDB `media` collection:
- `cloudinaryUrl`: relative URL path (`/mandakini/...` or `/uploads/...` or Cloudinary URL)
- `cloudinaryPublicId`: unique identifier (`mandakini/...` or `uploads/<uuid>`)
- `alt`: accessibility description
- `kind`: `'local'` or `'cloudinary'`
- `state`: `'active'` or `'deleting'`

To re-seed or initialize the categories, products, and media details in MongoDB, run:
```bash
npm run seed:mandakini
```
