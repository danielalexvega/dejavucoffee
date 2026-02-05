'use client';

// Simple portable text renderer
// For a more complete solution, install @portabletext/react
export function PortableText({ content }: { content?: any[] }) {
  if (!content || !Array.isArray(content)) {
    return null;
  }

  return (
    <div className="prose prose-lg max-w-none text-dark-green">
      {content.map((block: any, index: number) => {
        if (block._type === 'block') {
          const text = block.children?.map((child: any) => child.text).join('') || '';
          
          switch (block.style) {
            case 'h1':
              return <h1 key={index} className="text-4xl font-bold mb-4">{text}</h1>;
            case 'h2':
              return <h2 key={index} className="text-3xl font-bold mb-3">{text}</h2>;
            case 'h3':
              return <h3 key={index} className="text-2xl font-semibold mb-2">{text}</h3>;
            case 'h4':
              return <h4 key={index} className="text-xl font-semibold mb-2">{text}</h4>;
            case 'blockquote':
              return <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic my-4">{text}</blockquote>;
            default:
              return <p key={index} className="mb-4">{text}</p>;
          }
        }
        
        // Handle other block types (images, lists, etc.)
        return null;
      })}
    </div>
  );
}
