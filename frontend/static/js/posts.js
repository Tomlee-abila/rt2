// Post management: creation, display, commenting, filtering

window.Posts = {
    async loadPosts() {
        try {
            const url = ForumApp.currentCategory === 'all' ? 
                '/api/posts' : `/api/posts?category=${ForumApp.currentCategory}`;
            
            const response = await fetch(url);
            if (response.ok) {
                const posts = await response.json();
                this.displayPosts(posts);
            } else {
                showNotification('Failed to load posts', 'error');
            }
        } catch (error) {
            showNotification('Error loading posts', 'error');
        }
    },

    displayPosts(posts) {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return;

        postsContainer.innerHTML = '';

        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No posts in this category yet.</p>
                    <p>Be the first to start a discussion!</p>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    },

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow cursor-pointer';
        postDiv.onclick = () => this.openPost(post.id);

        postDiv.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${escapeHtml(post.title)}</h3>
                    <p class="text-gray-600 mb-3 line-clamp-3">${escapeHtml(post.content)}</p>
                    <div class="flex items-center text-sm text-gray-500">
                        <span class="bg-${this.getCategoryColor(post.category)}-100 text-${this.getCategoryColor(post.category)}-800 px-2 py-1 rounded-full text-xs mr-3">
                            ${post.category}
                        </span>
                        <span>by ${escapeHtml(post.author)}</span>
                        <span class="mx-2">•</span>
                        <span>${formatDate(post.createdAt)}</span>
                    </div>
                </div>
            </div>
        `;

        return postDiv;
    },

    getCategoryColor(category) {
        const colors = {
            'general': 'blue',
            'technology': 'green',
            'random': 'purple',
            'help': 'orange'
        };
        return colors[category] || 'gray';
    },

    async openPost(postId) {
        ForumApp.currentThreadId = postId;
        
        // Load comments
        await this.loadComments(postId);
        
        // Show thread view
        document.getElementById('forum-main').classList.add('hidden');
        document.getElementById('thread-view').classList.remove('hidden');
    },

    async loadComments(postId) {
        try {
            const response = await fetch(`/api/comments?post_id=${postId}`);
            if (response.ok) {
                const comments = await response.json();
                this.displayComments(comments);
            } else {
                showNotification('Failed to load comments', 'error');
            }
        } catch (error) {
            showNotification('Error loading comments', 'error');
        }
    },

    displayComments(comments) {
        const commentsContainer = document.getElementById('comments-container');
        if (!commentsContainer) return;

        commentsContainer.innerHTML = '';

        if (comments.length === 0) {
            commentsContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
            return;
        }

        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            commentsContainer.appendChild(commentElement);
        });
    },

    createCommentElement(comment) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'bg-gray-50 rounded-lg p-4 mb-3';

        commentDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center">
                    <span class="font-medium text-gray-900">${escapeHtml(comment.author)}</span>
                    <span class="text-gray-500 text-sm ml-2">${formatDate(comment.createdAt)}</span>
                </div>
            </div>
            <p class="text-gray-700">${escapeHtml(comment.content)}</p>
        `;

        return commentDiv;
    },

    async createPost() {
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        const category = document.getElementById('post-category').value;

        if (!title || !content) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, content, category }),
            });

            if (response.ok) {
                document.getElementById('post-title').value = '';
                document.getElementById('post-content').value = '';
                showNotification('Post created successfully!');
                this.loadPosts();
            } else {
                showNotification('Failed to create post', 'error');
            }
        } catch (error) {
            showNotification('Error creating post', 'error');
        }
    },

    async createComment() {
        const content = document.getElementById('comment-content').value;

        if (!content) {
            showNotification('Please enter a comment', 'error');
            return;
        }

        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    postId: ForumApp.currentThreadId, 
                    content 
                }),
            });

            if (response.ok) {
                document.getElementById('comment-content').value = '';
                showNotification('Comment added successfully!');
                this.loadComments(ForumApp.currentThreadId);
            } else {
                showNotification('Failed to add comment', 'error');
            }
        } catch (error) {
            showNotification('Error adding comment', 'error');
        }
    },

    setupEventListeners() {
        // Category navigation
        document.querySelectorAll('[data-category]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                ForumApp.currentCategory = e.target.dataset.category;
                
                // Update active category button
                document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                this.loadPosts();
            });
        });

        // Post creation
        document.getElementById('post-thread-btn')?.addEventListener('click', () => this.createPost());

        // Comment creation
        document.getElementById('post-reply-btn')?.addEventListener('click', () => this.createComment());

        // Back to forum button
        document.getElementById('back-to-forum')?.addEventListener('click', () => {
            document.getElementById('thread-view').classList.add('hidden');
            document.getElementById('forum-main').classList.remove('hidden');
            ForumApp.currentThreadId = null;
        });
    }
};

// Initialize posts event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Posts.setupEventListeners();
});
