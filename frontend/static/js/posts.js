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
        const threadsContainer = document.getElementById('threads-container');
        if (!threadsContainer) return;

        threadsContainer.innerHTML = '';

        if (posts.length === 0) {
            threadsContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No posts in this category yet.</p>
                    <p>Be the first to start a discussion!</p>
                </div>
            `;
            return;
        }

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            threadsContainer.appendChild(postElement);
        });
    },

    createPostElement(post) {
        const postDiv = document.createElement('div');
        postDiv.className = 'border-b border-gray-200 pb-4 mb-4 hover:bg-gray-50 p-3 rounded cursor-pointer transition-colors';
        postDiv.onclick = () => this.showPost(post.id);

        const avatarColor = post.authorColor || 'blue-500';
        const initials = post.authorInitials || post.author?.substring(0, 2).toUpperCase() || 'U';

        postDiv.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="w-10 h-10 rounded-full bg-${avatarColor} flex items-center justify-center text-white font-semibold text-sm">
                    ${initials}
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-medium text-gray-900 hover:text-blue-600 transition-colors">${escapeHtml(post.title)}</h3>
                    <div class="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <span>${escapeHtml(post.author)}</span>
                        <span>•</span>
                        <span>${formatTime(post.created_at)}</span>
                        <span>•</span>
                        <span class="bg-gray-100 px-2 py-1 rounded text-xs">${escapeHtml(post.category)}</span>
                    </div>
                    <p class="text-gray-600 text-sm mt-2 line-clamp-2">${escapeHtml(post.content?.substring(0, 150) || '')}${post.content?.length > 150 ? '...' : ''}</p>
                    <div class="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>${post.reply_count || 0} replies</span>
                        <span>Last activity: ${formatTime(post.updated_at || post.created_at)}</span>
                    </div>
                </div>
            </div>
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

    showPost(postId) {
        // Hide threads container and show thread detail
        document.getElementById('threads-container')?.parentElement.classList.add('hidden');
        document.getElementById('thread-detail')?.classList.remove('hidden');

        // Load post details
        this.loadPostDetails(postId);
    },

    async loadPostDetails(postId) {
        try {
            const response = await fetch(`/api/posts/${postId}`);
            if (response.ok) {
                const post = await response.json();
                this.displayPostDetails(post);
                this.loadComments(postId);
            } else {
                showNotification('Failed to load post details', 'error');
            }
        } catch (error) {
            showNotification('Error loading post details', 'error');
        }
    },

    displayPostDetails(post) {
        const avatarColor = post.authorColor || 'blue-500';
        const initials = post.authorInitials || post.author?.substring(0, 2).toUpperCase() || 'U';

        document.getElementById('thread-detail-title').textContent = post.title;
        document.getElementById('thread-detail-author').textContent = post.author;
        document.getElementById('thread-detail-time').textContent = formatTime(post.created_at);
        document.getElementById('thread-detail-content').textContent = post.content;

        const avatarElement = document.getElementById('thread-detail-avatar');
        avatarElement.className = `w-6 h-6 rounded-full bg-${avatarColor} flex items-center justify-center text-xs text-white`;
        avatarElement.textContent = initials;
    },

    clearThreadForm() {
        document.getElementById('thread-title').value = '';
        document.getElementById('thread-content').value = '';
        document.getElementById('thread-category').value = '';
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

    async showPost(postId) {
        ForumApp.currentThreadId = postId;

        // Hide threads container and show thread detail
        document.getElementById('threads-container')?.parentElement.classList.add('hidden');
        document.getElementById('thread-detail')?.classList.remove('hidden');

        // Load post details and comments
        await this.loadPostDetails(postId);
        await this.loadComments(postId);
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
        const repliesContainer = document.getElementById('thread-replies');
        if (!repliesContainer) return;

        repliesContainer.innerHTML = '';

        if (comments.length === 0) {
            repliesContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p>No replies yet. Be the first to reply!</p>
                </div>
            `;
            return;
        }

        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            repliesContainer.appendChild(commentElement);
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
        const title = document.getElementById('thread-title').value;
        const content = document.getElementById('thread-content').value;
        const category = document.getElementById('thread-category').value;

        if (!title || !content || !category) {
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
                this.clearThreadForm();
                document.getElementById('thread-form')?.classList.add('hidden');
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
        const content = document.getElementById('reply-content').value;

        if (!content) {
            showNotification('Please enter a reply', 'error');
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
                document.getElementById('reply-content').value = '';
                showNotification('Reply added successfully!');
                this.loadComments(ForumApp.currentThreadId);
            } else {
                showNotification('Failed to add reply', 'error');
            }
        } catch (error) {
            showNotification('Error adding reply', 'error');
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

        // New thread button
        document.getElementById('new-thread-btn')?.addEventListener('click', () => {
            document.getElementById('thread-form')?.classList.remove('hidden');
        });

        // Cancel thread button
        document.getElementById('cancel-thread-btn')?.addEventListener('click', () => {
            document.getElementById('thread-form')?.classList.add('hidden');
            this.clearThreadForm();
        });

        // Post creation
        document.getElementById('post-thread-btn')?.addEventListener('click', () => this.createPost());

        // Comment creation
        document.getElementById('post-reply-btn')?.addEventListener('click', () => this.createComment());

        // Back to threads button
        document.getElementById('back-to-threads')?.addEventListener('click', () => {
            document.getElementById('thread-detail')?.classList.add('hidden');
            document.getElementById('threads-container')?.parentElement.classList.remove('hidden');
            ForumApp.currentThreadId = null;
        });
    }
};

// Initialize posts event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    Posts.setupEventListeners();
});
