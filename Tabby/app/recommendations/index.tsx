import React, { useState } from 'react';
import { FlatList, Pressable } from 'react-native';
import BookPreview from '@/components/BookPreview'; // Adjust the path as necessary
import { SafeAreaView } from 'react-native-safe-area-context';
import AddButtonIcon from '@/components/AddButtonIcon';
type Book = {
    id: string;
    title: string;
    author: string;
    summary: string;
    excerpt: string;
    image: string;
    isAddedToLibrary: boolean;
};

// test data to see how the recconmendation page would look
const initialBooks: Book[] = [
    {
        id: '1',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        summary: 'A novel about the American dream.',
        excerpt: 'A novel about the American dream.',
        image: 'https://m.media-amazon.com/images/I/81QuEGw8VPL._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },
    {
        id: '2',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        excerpt: 'A novel about racism and injustice.',
        summary: 'A novel about racism and injustice.',

        image: 'https://m.media-amazon.com/images/I/81aY1lxk+9L._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },
    {
        id: '3',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        summary: 'A novel about the American dream.',
        excerpt: 'A novel about the American dream.',
        image: 'https://m.media-amazon.com/images/I/81QuEGw8VPL._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },
    {
        id: '4',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        excerpt: 'A novel about racism and injustice.',
        summary: 'A novel about racism and injustice.',

        image: 'https://m.media-amazon.com/images/I/81aY1lxk+9L._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },

    {
        id: '5',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        summary: 'A novel about the American dream.',
        excerpt: 'A novel about the American dream.',
        image: 'https://m.media-amazon.com/images/I/81QuEGw8VPL._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },
    {
        id: '6',
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        excerpt: 'A novel about racism and injustice.',
        summary: 'A novel about racism and injustice.',

        image: 'https://m.media-amazon.com/images/I/81aY1lxk+9L._AC_UF1000,1000_QL80_.jpg',
        isAddedToLibrary: false,
    },


];

const Reccomendations: React.FC = () => {
    // State to keep track of books and their favorite status
    const [books, setBooks] = useState<Book[]>(initialBooks);

    // will change the state of the book to add to library
    const handleAddToLibraryPress = (bookId: string) => {
        setBooks((prevBooks) =>
            prevBooks.map((book) =>
                book.id === bookId
                    ? { ...book, isAddedToLibrary: !book.isAddedToLibrary } // Toggle added to library status
                    : book
            )
        );
    };

    // book add button to be passed as a prop to the book previews
    const renderBookButton = (book: { id: string; isAddedToLibrary: boolean }) => (
        <Pressable onPress={() => handleAddToLibraryPress(book.id)} className="ml-4">
            <AddButtonIcon isAdded={book.isAddedToLibrary} />
        </Pressable>
    );

    return (
        <SafeAreaView className="flex-1 p-4">
            <FlatList
                data={books}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <BookPreview
                        book={item}
                        button={renderBookButton(item)} // Passing the Pressable button as a prop
                        isReccommendation={true}
                    />
                )}
            />
        </SafeAreaView>
    );
};

export default Reccomendations;