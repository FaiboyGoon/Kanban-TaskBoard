import { API_BASE_URL } from './apiConfig.js';

document.addEventListener('DOMContentLoaded', async () => {

  const themeToggle = document.getElementById('theme');
  if (themeToggle) {
    themeToggle.addEventListener('change', () => {
      document.body.classList.toggle('dark');
      document.getElementById("Dark-mode").innerHTML = document.body.classList.contains('Dark Mode');
    });
  } else {
    console.error('Elemento theme não encontrado');
  }

  const loginButton = document.getElementById('login-button');
  if (loginButton) {
    loginButton.addEventListener('click', handleLogin);
  } else {
    console.error('Pagina Boards nao possui botao de login');
  }

  const clickEnter = addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      handleLogin();
    }
  });

  const userBoardsDropdown = document.getElementById('user-boards-dropdown');
  if (userBoardsDropdown) {
    userBoardsDropdown.addEventListener('change', async () => {
      const boardId = userBoardsDropdown.value;
      if (boardId) {
        await loadBoardById(boardId);
      } else {
        document.getElementById('board-details').innerHTML = '';
      }
    });
  }

  await loadUserBoards();

  const storedEmail = localStorage.getItem('userEmail');
  if (storedEmail) {
    document.getElementById('userEmail').textContent = storedEmail; 
  }

  async function handleLogin() {
    const email = document.getElementById('email').value;

    if (!email) {
      alert('Por favor, insira um email');
      return;
    }

    try {
      
      const response = await fetch(`${API_BASE_URL}/GetPersonByEmail?Email=${encodeURIComponent(email)}`);

      const user = await response.json();

      if (user) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userId', user.Id); 
        window.location.href = 'boards.html';
      } else {
        const showError = document.getElementById('error');
        showError.innerHTML = "Email não encontrado, verifique seu email e tente novamente";
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Falha ao fazer login.');
    }
  }


  const addColumnButton = document.getElementById('add-column');
  if (addColumnButton) {
    addColumnButton.addEventListener('click', async () => {
      const boardId = document.getElementById('user-boards-dropdown').value;
      if (!boardId) {
        alert('Por favor, selecione uma board primeiro');
        return;
      }
      await createNewColumn(boardId);
    });
  }


  const createBoardButton = document.getElementById('create-board');
  if (createBoardButton) {
    createBoardButton.addEventListener('click', async () => {
      const boardName = prompt('Digite o nome da nova Board:');
      if (boardName) {
        try {
          const userId = localStorage.getItem('userId');

          if (!userId) {
            throw new Error('Usuário não está logado');
          }

          const response = await fetch(`${API_BASE_URL}/Board`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              Name: boardName,
              IsActive: true,
              CreatedBy: parseInt(userId),
              UpdatedBy: parseInt(userId)
            })
          });

          if (!response.ok) {
            throw new Error('Erro ao criar a Board');
          }

          const newBoard = await response.json();
          await loadUserBoards();
        
          const userBoardsDropdown = document.getElementById('user-boards-dropdown');
          if (userBoardsDropdown) {
            userBoardsDropdown.value = newBoard;
            await loadBoardById(newBoard);
          }
        } catch (error) {
          console.error('Erro ao criar a Board:', error);
          alert('Erro ao criar a Board. Por favor,  verifique se está logado.');
        }
      }
    });
  }

  const deleteBoardButton = document.getElementById('delete-board');
  if (deleteBoardButton) {
    deleteBoardButton.addEventListener('click', async () => {
      const boardId = document.getElementById('user-boards-dropdown').value;
      if (!boardId) {
        alert('Por favor, selecione uma board a ser excluida');
        return;
      }
      
      if (confirm('Tem certeza que deseja excluir esta Board e todas as tarefas incluidas?')) {
        await deleteBoard(boardId);
      }
    });
  }

});

async function loadUserBoards() {
  try {
    const response = await fetch(`${API_BASE_URL}/Boards`);
    const boards = await response.json();

    const userBoardsDropdown = document.getElementById('user-boards-dropdown');
    userBoardsDropdown.innerHTML = '<option value="">Selecione uma board</option>';

    boards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.Id;
      option.textContent = board.Name;
      userBoardsDropdown.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar as Boards do usuário:', error);
  }
}

async function loadBoardById(boardId) {
  try {
    const response = await fetch(`${API_BASE_URL}/Board?BoardId=${boardId}`);
    const board = await response.json();
    
    document.getElementById('current-board-name').textContent = board.Name;
    

    const columnsResponse = await fetch(`${API_BASE_URL}/ColumnByBoardId?BoardId=${boardId}`);
    const columns = await columnsResponse.json();
    
    const columnsContainer = document.getElementById('columns-container');
    columnsContainer.innerHTML = '';
    
    for (const column of columns) {
      const columnElement = createColumnElement(column);
      columnsContainer.appendChild(columnElement);
 
      const tasksResponse = await fetch(`${API_BASE_URL}/TasksByColumnId?ColumnId=${column.Id}`);
      const tasks = await tasksResponse.json();
      
      const taskList = columnElement.querySelector('.task-list');
      tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar a Board:', error);
  }
}

function createColumnElement(column) {
  const columnElement = document.createElement('div');
  columnElement.className = 'column';
  columnElement.innerHTML = `
    <div class="column-header">
      <h3 class="column-title">${column.Name}</h3>
      <div class="column-actions">
        <button class="add-task-btn" title="Adicionar tarefa">+</button>
        <button class="delete-column-btn" title="Excluir lista">✕</button>
      </div>
    </div>
    <div class="task-list"></div>
  `;
  

  const addTaskBtn = columnElement.querySelector('.add-task-btn');
  addTaskBtn.addEventListener('click', () => addNewTask(column.Id));


  const deleteColumnBtn = columnElement.querySelector('.delete-column-btn');
  deleteColumnBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta lista e todas as suas tarefas?')) {
      await deleteColumn(column.Id);
    }
  });
  
  return columnElement;
}


async function deleteColumn(columnId) {
  try {
    const response = await fetch(`${API_BASE_URL}/Column?ColumnId=${columnId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir lista');
    }


    const boardId = document.getElementById('user-boards-dropdown').value;
    await loadBoardById(boardId);
  } catch (error) {
    console.error('Erro ao excluir lista:', error);
    alert('Erro ao excluir lista');
  }
}

function createTaskElement(task) {
  const taskElement = document.createElement('div');
  taskElement.className = 'task-card';
  taskElement.innerHTML = `
    <div class="task-content">
      <div class="task-title">${task.Title}</div>
      <div class="task-description">${task.Description || ''}</div>
    </div>
    <div class="task-actions">
      <button class="edit-task-btn" title="Editar tarefa">✎</button>
      <button class="delete-task-btn" title="Excluir tarefa">✕</button>
    </div>
  `;


  const editBtn = taskElement.querySelector('.edit-task-btn');
  editBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const newTitle = prompt('Digite o novo título da tarefa:', task.Title);
    if (newTitle && newTitle !== task.Title) {
      await updateTask({
        ...task,
        Title: newTitle
      });
    }
  });

  const deleteBtn = taskElement.querySelector('.delete-task-btn');
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation(); 
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      await deleteTask(task.Id);
    }
  });
  
  return taskElement;
}

async function updateTask(task) {
  try {
    const response = await fetch(`${API_BASE_URL}/Task`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      throw new Error('Erro ao atualizar tarefa');
    }

    const boardId = document.getElementById('user-boards-dropdown').value;
    await loadBoardById(boardId);
  } catch (error) {
    console.error('Erro ao atualizar tarefa:', error);
    alert('Erro ao atualizar tarefa');
  }
}

async function deleteTask(taskId) {
  try {
    const response = await fetch(`${API_BASE_URL}/Task?TaskId=${taskId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir tarefa');
    }

    const boardId = document.getElementById('user-boards-dropdown').value;
    await loadBoardById(boardId);
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    alert('Erro ao excluir tarefa');
  }
}

async function addNewTask(columnId) {
  const taskTitle = prompt('Digite o título da tarefa:');
  if (taskTitle) {
    try {
      const response = await fetch(`${API_BASE_URL}/Task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ColumnId: columnId,
          Title: taskTitle,
          IsActive: true
        })
      });

      if (!response.ok) throw new Error('Erro ao criar tarefa');
      
      const boardId = document.getElementById('user-boards-dropdown').value;
      await loadBoardById(boardId);
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
    }
  }
}

async function createNewColumn(boardId) {
  const columnName = prompt('Digite o nome da nova lista:');
  if (columnName) {
    try {
      const response = await fetch(`${API_BASE_URL}/Column`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BoardId: parseInt(boardId),
          Name: columnName,
          Position: 0,
          IsActive: true
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao criar nova lista');
      }

      
      await loadBoardById(boardId);
    } catch (error) {
      console.error('Erro ao criar nova lista:', error);
      alert('Erro ao criar nova lista');
    }
  }
}


const addBoardButton = document.getElementById('add-board');
if (addBoardButton) {
  addBoardButton.addEventListener('click', async () => {
    const boardName = prompt('Digite o nome da nova Board:');
    if (boardName) {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          throw new Error('Usuário não está logado');
        }

        const response = await fetch(`${API_BASE_URL}/Board`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            Name: boardName,
            IsActive: true,
            CreatedBy: parseInt(userId),
            UpdatedBy: parseInt(userId)
          })
        });

        if (!response.ok) {
          throw new Error('Erro ao criar a Board');
        }

        const newBoard = await response.json();
        console.log('Nova Board criada:', newBoard);
        await loadUserBoards(); 
        
       
        const userBoardsDropdown = document.getElementById('user-boards-dropdown');
        if (userBoardsDropdown) {
          userBoardsDropdown.value = newBoard;
          await loadBoardById(newBoard);
        }
      } catch (error) {
        console.error('Erro ao criar a Board:', error);
        alert('Erro ao criar a Board. Por favor, verifique se está logado.');
      }
    }
  });
}


async function deleteBoard(boardId) {
  try {
    const response = await fetch(`${API_BASE_URL}Board?BoardId=${BoardId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Erro ao excluir a Board ');
    }


    document.getElementById('columns-container').innerHTML = '';
    document.getElementById('current-board-name').textContent = 'Nome da Board';
    

    await loadUserBoards();
 
    const userBoardsDropdown = document.getElementById('user-boards-dropdown');
    userBoardsDropdown.value = '';

  } catch (error) {
    console.error('Erro ao excluir a Board:', error);
    alert('Erro ao excluir a Board');
  }
}