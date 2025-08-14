window.Posts = {
    async loadPosts() {
        if (!ForumApp.currentUser) {
            DOM.loginModal.classList.remove('hidden');
            return;
        }
        try {
            const url = ForumApp.currentCategory === 'all' ? '/api/posts' : `/api/posts?category_id=${ForumApp.currentCategory}`;
            const response = await fetch(url, { credentials: 'include' });
            if (response.ok) {
                const posts = await response.json();
                this.displayPosts(posts);
            } else {
                showNotification('Failed to load posts', 'error');
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            showNotification('Error loading posts', 'error');
        }
    },

    displayPosts(posts) {
        const threadsContainer = DOM.threadsContainer;
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
        const div = document.createElement('div');
        div.className = 'bg-white p-4 rounded-md shadow-sm border border-gray-200 hover:shadow-md transition';
        div.innerHTML = `
            <div class="flex items-center space-x-2 mb-2">
                <div class="w-6 h-6 rounded-full bg-${post.avatar_color || 'blue-500'} flex items-center justify-center text-xs text-white">
                    ${post.nickname ? post.nickname.substring(0, 2).toUpperCase() : 'U'}
                </div>
                <span class="text-sm font-medium text-gray-700">${escapeHtml(post.nickname)}</span>
                <span class="text-sm text-gray-500">• ${formatDate(post.created_at)}</span>
            </div>
            <h3 class="text-lg font-semibold text-gray-800 mb-2">${escapeHtml(post.title)}</h3>
            <p class="text-gray-600 mb-3 line-clamp-3">${escapeHtml(post.content)}</p>
            <div class="flex justify-between items-center text-sm text-gray-500">
                <span>${post.comment_count || 0} comments</span>
                <button data-post-id="${post.id}" class="view-post-btn text-blue-600 hover:text-blue-800">View post</button>
            </div>
        `;
        div.querySelector('.view-post-btn').addEventListener('click', () => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            this.loadPostDetails(post.id);
        });
        return div;
    },

    async loadPostDetails(postId) {
        try {
            ForumApp.currentThreadId = postId;
            const response = await fetch(`/api/posts?post_id=${postId}`, { credentials: 'include' });
            if (response.ok) {
                const post = await response.json();
                this.displayPostDetails(post);
                await this.loadComments(postId);
                DOM.threadsContainer.classList.add('hidden');
                DOM.threadDetail.classList.remove('hidden');
            } else {
                showNotification('Failed to load post details', 'error');
            }
        } catch (error) {
            console.error('Error loading post details:', error);
            showNotification('Error loading post details', 'error');
        }
    },

    displayPostDetails(post) {
        const title = document.getElementById('thread-detail-title');
        const avatar = document.getElementById('thread-detail-avatar');
        const author = document.getElementById('thread-detail-author');
        const time = document.getElementById('thread-detail-time');
        const content = document.getElementById('thread-detail-content');

        if (title && avatar && author && time && content) {
            title.textContent = post.title;
            avatar.className = `w-6 h-6 rounded-full bg-${post.avatar_color || 'blue-500'} flex items-center justify-center text-xs text-white`;
            avatar.textContent = post.nickname ? post.nickname.substring(0, 2).toUpperCase() : 'U';
            author.textContent = post.nickname;
            time.textContent = formatDate(post.created_at);
            content.textContent = post.content;
        }
    },

    async loadComments(postId) {
        try {
            const response = await fetch(`/api/comments?post_id=${postId}`, { credentials: 'include' });
            if (response.ok) {
                const comments = await response.json();
                this.displayComments(comments);
            } else {
                showNotification('Failed to load comments', 'error');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            showNotification('Error loading comments', 'error');
        }
    },

    displayComments(comments) {
        const repliesContainer = document.getElementById('thread-replies');
        if (!repliesContainer) return;

        repliesContainer.innerHTML = '';

        comments.forEach(comment => {
            const div = document.createElement('div');
            div.className = 'p-3 bg-gray-50 rounded-md';
            div.innerHTML = `
                <div class="flex items-center space-x-2 mb-2">
                    <div class="w-6 h-6 rounded-full bg-${comment.avatar_color || 'blue-500'} flex items-center justify-center text-xs text-white">
                        ${comment.nickname ? comment.nickname.substring(0, 2).toUpperCase() : 'U'}
                    </div>
                    <span class="text-sm font-medium text-gray-700">${escapeHtml(comment.nickname)}</span>
                    <span class="text-sm text-gray-500">• ${formatDate(comment.created_at)}</span>
                </div>
                <p class="text-gray-600">${escapeHtml(comment.content)}</p>
            `;
            repliesContainer.appendChild(div);
        });
    },

    async createPost(title, content, categoryId) {
        if (!ForumApp.currentUser) {
            DOM.loginModal.classList.remove('hidden');
            return;
        }
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, categoryId: parseInt(categoryId) }),
                credentials: 'include'
            });

            if (response.ok) {
                const post = await response.json();
                DOM.threadForm.classList.add('hidden');
                this.loadPosts();
                showNotification('Post created successfully!');
            } else {
                const error = await response.text();
                showNotification(error || 'Failed to create post', 'error');
            }
        } catch (error) {
            console.error('Error creating post:', error);
            showNotification('Error creating post', 'error');
        }
    },

    async createComment(postId, content) {
        if (!ForumApp.currentUser) {
            DOM.loginModal.classList.remove('hidden');
            return;
        }
        try {
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postId: postId, content }),
                credentials: 'include'
            });

            if (response.ok) {
                const comment = await response.json();
                this.loadComments(postId);
                document.getElementById('reply-content').value = '';
                showNotification('Comment posted successfully!');
            } else {
                const error = await response.text();
                showNotification(error || 'Failed to post comment', 'error');
            }
        } catch (error) {
            console.error('Error creating comment:', error);
            showNotification('Error posting comment', 'error');
        }
    },

    async populateCategories() {
        const categorySelect = document.getElementById('thread-category');
        const categoryList = document.getElementById('category-list');
        const mobileCategoryList = document.getElementById('mobile-category-list');
        if (!categorySelect || !categoryList || !mobileCategoryList) return;

        try {
            const response = await fetch('/api/categories', { credentials: 'include' });
            if (response.ok) {
                const categories = await response.json();
                categorySelect.innerHTML = '<option value="">Select a category</option>';
                categoryList.innerHTML = '';
                mobileCategoryList.innerHTML = '';

                // Add 'All' option for category list
                const allButton = document.createElement('button');
                allButton.className = `px-3 py-1 rounded-md ${ForumApp.currentCategory === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`;
                allButton.dataset.category = 'all';
                allButton.textContent = 'All';
                allButton.addEventListener('click', () => {
                    if (!ForumApp.currentUser) {
                        DOM.loginModal.classList.remove('hidden');
                        return;
                    }
                    ForumApp.currentCategory = 'all';
                    document.querySelectorAll('#category-list button, #mobile-category-list button').forEach(btn => {
                        btn.classList.remove('bg-blue-100', 'text-blue-700');
                        btn.classList.add('text-gray-700');
                    });
                    allButton.classList.add('bg-blue-100', 'text-blue-700');
                    document.getElementById('current-category').textContent = 'All';
                    this.loadPosts();
                });
                categoryList.appendChild(allButton);
                mobileCategoryList.appendChild(allButton.cloneNode(true));

                categories.forEach(category => {
                    // Populate select dropdown
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    categorySelect.appendChild(option);

                    // Populate category list
                    const button = document.createElement('button');
                    button.className = `px-3 py-1 rounded-md ${ForumApp.currentCategory == category.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`;
                    button.dataset.category = category.id;
                    button.textContent = category.name;
                    button.addEventListener('click', () => {
                        if (!ForumApp.currentUser) {
                            DOM.loginModal.classList.remove('hidden');
                            return;
                        }
                        ForumApp.currentCategory = category.id;
                        document.querySelectorAll('#category-list button, #mobile-category-list button').forEach(btn => {
                            btn.classList.remove('bg-blue-100', 'text-blue-700');
                            btn.classList.add('text-gray-700');
                        });
                        button.classList.add('bg-blue-100', 'text-blue-700');
                        document.getElementById('current-category').textContent = category.name;
                        this.loadPosts();
                    });
                    categoryList.appendChild(button);
                    mobileCategoryList.appendChild(button.cloneNode(true));
                });
            } else {
                throw new Error('Failed to load categories');
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            // Fallback to static categories
            const categories = [
                { id: 1, name: 'General Discussion' },
                { id: 2, name: 'Technology' },
                { id: 3, name: 'Random' },
                { id: 4, name: 'Help' }
            ];
            categorySelect.innerHTML = '<option value="">Select a category</option>';
            categoryList.innerHTML = '';
            mobileCategoryList.innerHTML = '';

            const allButton = document.createElement('button');
            allButton.className = `px-3 py-1 rounded-md ${ForumApp.currentCategory === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`;
            allButton.dataset.category = 'all';
            allButton.textContent = 'All';
            allButton.addEventListener('click', () => {
                if (!ForumApp.currentUser) {
                    DOM.loginModal.classList.remove('hidden');
                    return;
                }
                ForumApp.currentCategory = 'all';
                document.querySelectorAll('#category-list button, #mobile-category-list button').forEach(btn => {
                    btn.classList.remove('bg-blue-100', 'text-blue-700');
                    btn.classList.add('text-gray-700');
                });
                allButton.classList.add('bg-blue-100', 'text-blue-700');
                document.getElementById('current-category').textContent = 'All';
                this.loadPosts();
            });
            categoryList.appendChild(allButton);
            mobileCategoryList.appendChild(allButton.cloneNode(true));

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categorySelect.appendChild(option);

                const button = document.createElement('button');
                button.className = `px-3 py-1 rounded-md ${ForumApp.currentCategory == category.id ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`;
                button.dataset.category = category.id;
                button.textContent = category.name;
                button.addEventListener('click', () => {
                    if (!ForumApp.currentUser) {
                        DOM.loginModal.classList.remove('hidden');
                        return;
                    }
                    ForumApp.currentCategory = category.id;
                    document.querySelectorAll('#category-list button, #mobile-category-list button').forEach(btn => {
                        btn.classList.remove('bg-blue-100', 'text-blue-700');
                        btn.classList.add('text-gray-700');
                    });
                    button.classList.add('bg-blue-100', 'text-blue-700');
                    document.getElementById('current-category').textContent = category.name;
                    this.loadPosts();
                });
                categoryList.appendChild(button);
                mobileCategoryList.appendChild(button.cloneNode(true));
            });
        }
    },

    setupEventListeners() {
        document.getElementById('new-thread-btn')?.addEventListener('click', () => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            DOM.threadForm.classList.toggle('hidden');
        });

        document.getElementById('post-thread-btn')?.addEventListener('click', () => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            const title = document.getElementById('thread-title').value.trim();
            const content = document.getElementById('thread-content').value.trim();
            const categoryId = document.getElementById('thread-category').value;

            if (!title || !content || !categoryId) {
                showNotification('Please fill in all fields', 'error');
                return;
            }

            this.createPost(title, content, categoryId);
        });

        document.getElementById('cancel-thread-btn')?.addEventListener('click', () => {
            DOM.threadForm.classList.add('hidden');
            document.getElementById('thread-title').value = '';
            document.getElementById('thread-content').value = '';
            document.getElementById('thread-category').value = '';
        });

        document.getElementById('post-reply-btn')?.addEventListener('click', () => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            const content = document.getElementById('reply-content').value.trim();
            if (!content) {
                showNotification('Please enter a comment', 'error');
                return;
            }
            this.createComment(ForumApp.currentThreadId, content);
        });

        document.getElementById('back-to-threads')?.addEventListener('click', () => {
            DOM.threadDetail.classList.add('hidden');
            DOM.threadsContainer.classList.remove('hidden');
            ForumApp.currentThreadId = null;
        });

        document.getElementById('thread-category')?.addEventListener('change', (e) => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            ForumApp.currentCategory = e.target.value || 'all';
            this.loadPosts();
        });

        document.getElementById('category-list')?.addEventListener('click', (e) => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            const button = e.target.closest('[data-category]');
            if (button) {
                ForumApp.currentCategory = button.dataset.category || 'all';
                document.querySelectorAll('#category-list button').forEach(btn => {
                    btn.classList.remove('bg-blue-100', 'text-blue-700');
                    btn.classList.add('text-gray-700');
                });
                button.classList.add('bg-blue-100', 'text-blue-700');
                document.getElementById('current-category').textContent = button.textContent;
                this.loadPosts();
            }
        });

        document.getElementById('mobile-category-list')?.addEventListener('click', (e) => {
            if (!ForumApp.currentUser) {
                DOM.loginModal.classList.remove('hidden');
                return;
            }
            const button = e.target.closest('[data-category]');
            if (button) {
                ForumApp.currentCategory = button.dataset.category || 'all';
                document.getElementById('current-category').textContent = button.textContent;
                this.loadPosts();
                toggleMobileMenu();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    Posts.setupEventListeners();
    Posts.populateCategories();
});