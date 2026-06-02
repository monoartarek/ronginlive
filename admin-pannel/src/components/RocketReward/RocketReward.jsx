import React, { useEffect, useState } from "react";
import "./RocketReward.css";

const SERVER_URL = "https://parse.musicliveapp.xyz/parse";
const APP_ID = "myAppId1";
const MASTER_KEY = "myMasterKey";

const headers = {
  "X-Parse-Application-Id": APP_ID,
  "X-Parse-Master-Key": MASTER_KEY,
};

const PAGE_SIZE = 50;

export default function RocketReward() {
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [form, setForm] = useState({
    level: "Level 1",
    category: "Category 1",
    rewardType: "Coins",
    coins: "",
    points: "",
    gift: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${SERVER_URL}/classes/RocketReward?limit=1000&order=-updatedAt`,
        { headers }
      );

      const json = await res.json();

      const results = (json.results || []).map((item) => ({
        objectId: item.objectId,
        level: item.level || "",
        category: item.category || "",
        rewardType: item.rewardType || "",
        coins: item.coins || "",
        points: item.points || "",
        gift: item.gift || "",
        preview: item.preview || "",
        updatedAt: item.updatedAt,
      }));

      setData(results);
      setFiltered(results);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearch(value);
    setPage(0);

    const filteredData = data.filter((item) =>
      item.objectId.toLowerCase().includes(value)
    );

    setFiltered(filteredData);
  };

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paginated = filtered.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const changePage = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFile = (e) => {
    setForm({ ...form, gift: e.target.files[0] });
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({
      level: "Level 1",
      category: "Category 1",
      rewardType: "Coins",
      coins: "",
      points: "",
      gift: null,
    });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm(item);
    setShowModal(true);
  };

  const saveReward = async () => {
    let fileUrl = "";

    try {
      // Upload file if asset selected
      if (form.rewardType === "Assets" && form.gift) {
        const fileData = new FormData();
        fileData.append("file", form.gift);

        const upload = await fetch(`${SERVER_URL}/files/${form.gift.name}`, {
          method: "POST",
          headers: {
            "X-Parse-Application-Id": APP_ID,
            "X-Parse-Master-Key": MASTER_KEY,
          },
          body: formDataFix(form.gift),
        });

        const fileRes = await upload.json();
        fileUrl = fileRes.url;
      }

      const payload = {
        level: form.level,
        category: form.category,
        rewardType: form.rewardType,
        coins: form.rewardType === "Coins" ? String(form.coins) : "",
        points: form.rewardType === "Points" ? String(form.points) : "",
        gift: form.rewardType === "Assets" ? fileUrl : "",
        preview: form.rewardType === "Assets" ? fileUrl : "",
      };

      let res;

      if (editItem) {
        res = await fetch(
          `${SERVER_URL}/classes/RocketReward/${editItem.objectId}`,
          {
            method: "PUT",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`${SERVER_URL}/classes/RocketReward`, {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();

      if (!res.ok || json.error) {
        alert(json.error);
        return;
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const formDataFix = (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fd;
  };

  const deleteReward = async (item) => {
    if (!window.confirm("Delete?")) return;

    await fetch(
      `${SERVER_URL}/classes/RocketReward/${item.objectId}`,
      {
        method: "DELETE",
        headers,
      }
    );

    fetchData();
  };

  return (
    <div className="rocket-page">

      <h2 className="title">🚀 Rocket Rewards</h2>

      <div className="top-bar">
        <button className="add-btn" onClick={openAdd}>
          Add Reward
        </button>

        <input
          type="text"
          placeholder="Search ObjectId"
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Level</th>
              <th>Category</th>
              <th>Type</th>
              <th>Coins</th>
              <th>Points</th>
              <th>Gift</th>
              <th>Preview</th>
              <th>ID</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10">Loading...</td>
              </tr>
            ) : paginated.map((item) => (
              <tr key={item.objectId}>
                <td>{item.level}</td>
                <td>{item.category}</td>
                <td>{item.rewardType}</td>
                <td>{item.coins}</td>
                <td>{item.points}</td>
                <td>{item.gift}</td>
                <td>
                  {item.preview && (
                    <img src={item.preview} className="preview" alt="" />
                  )}
                </td>
                <td>{item.objectId}</td>
                <td>{new Date(item.updatedAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => openEdit(item)}>Edit</button>
                  <button onClick={() => deleteReward(item)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => changePage(page - 1)}>
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => changePage(i)}>
              {i + 1}
            </button>
          ))}

          <button
            disabled={page === totalPages - 1}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal">
          <div className="modal-content">

            <h3>{editItem ? "Edit Reward" : "Add Reward"}</h3>

            <select name="level" value={form.level} onChange={handleChange}>
              <option>Level 1</option>
              <option>Level 2</option>
              <option>Level 3</option>
              <option>Level 4</option>
              <option>Level 5</option>
            </select>

            <select name="category" value={form.category} onChange={handleChange}>
              <option>Category 1</option>
              <option>Category 2</option>
              <option>Category 3</option>
            </select>

            <select name="rewardType" value={form.rewardType} onChange={handleChange}>
              <option>Coins</option>
              <option>Points</option>
              <option>Assets</option>
            </select>

            {form.rewardType === "Coins" && (
              <input name="coins" placeholder="Coins" onChange={handleChange} />
            )}

            {form.rewardType === "Points" && (
              <input name="points" placeholder="Points" onChange={handleChange} />
            )}

            {form.rewardType === "Assets" && (
              <input type="file" onChange={handleFile} />
            )}

            <div className="modal-actions">
              <button onClick={saveReward}>Save</button>
              <button onClick={() => setShowModal(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}