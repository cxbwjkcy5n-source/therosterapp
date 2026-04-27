import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let personId: string;
  let personId2: string;
  let dateId: string;
  let dateIdForDeletion: string;
  let reviewDateId: string;
  let interactionId: string;
  let noteId: string;
  let reminderId: string;

  // ========== Auth Setup ==========
  test("Sign up test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    userId = user.id;
    expect(authToken).toBeDefined();
    expect(userId).toBeDefined();
  });

  // ========== Persons CRUD Tests ==========
  test("Create a person with required fields only", async () => {
    const res = await authenticatedApi("/api/persons", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Alice",
        location: "San Francisco",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    personId = data.id;
    expect(data.name).toBe("Alice");
    expect(data.location).toBe("San Francisco");
    expect(data.id).toBeDefined();
    expect(data.userId).toBe(userId);
  });

  test("Create a person with all optional fields", async () => {
    const res = await authenticatedApi("/api/persons", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bob",
        location: "New York",
        photoUrl: "https://example.com/photo.jpg",
        age: 28,
        zodiac: "leo",
        instagram: "@bob",
        tiktok: "@bobvids",
        twitterX: "@bob_tweets",
        interestLevel: 7,
        attractiveness: 8,
        sexualChemistry: 6,
        communication: 8,
        connectionType: "casual",
        hobbies: ["hiking", "photography"],
        favoriteFoods: ["pizza", "sushi"],
        redFlags: ["workaholic"],
        greenFlags: ["kind", "funny"],
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    personId2 = data.id;
    expect(data.name).toBe("Bob");
  });

  test("Create person fails without required name field", async () => {
    const res = await authenticatedApi("/api/persons", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "Boston",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create person fails without required location field", async () => {
    const res = await authenticatedApi("/api/persons", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Charlie",
      }),
    });
    await expectStatus(res, 400);
  });

  test("List active (non-benched) persons", async () => {
    const res = await authenticatedApi("/api/persons", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.persons).toBeDefined();
    expect(Array.isArray(data.persons)).toBe(true);
    // Should contain the persons we just created
    const names = data.persons.map((p: any) => p.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  test("Get person by ID", async () => {
    const res = await authenticatedApi(`/api/persons/${personId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.person.id).toBe(personId);
    expect(data.person.name).toBe("Alice");
    expect(data.person.location).toBe("San Francisco");
  });

  test("Get person with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Get nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Update person with partial data", async () => {
    const res = await authenticatedApi(`/api/persons/${personId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interestLevel: 9,
        attractiveness: 8,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.person.id).toBe(personId);
  });

  test("Update person with all fields", async () => {
    const res = await authenticatedApi(`/api/persons/${personId2}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bobby",
        location: "Los Angeles",
        age: 29,
        zodiac: "virgo",
        interestLevel: 6,
        attractiveness: 7,
        sexualChemistry: 7,
        communication: 9,
        connectionType: "serious",
        hobbies: ["cooking", "reading"],
        favoriteFoods: ["tacos"],
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update person with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid",
      authToken,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test" }),
      }
    );
    await expectStatus(res, 400);
  });

  test("Update nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Ghost" }),
      }
    );
    await expectStatus(res, 404);
  });

  test("Bench a person", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId}/bench`,
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Not compatible" }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(personId);
    expect(data.isBenched).toBe(true);
    expect(data.benchReason).toBe("Not compatible");
  });

  test("Bench a person without reason", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId2}/bench`,
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.isBenched).toBe(true);
  });

  test("Bench person with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid/bench",
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 400);
  });

  test("Bench nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000/bench",
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await expectStatus(res, 404);
  });

  test("List benched persons", async () => {
    const res = await authenticatedApi("/api/bench", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.persons).toBeDefined();
    expect(Array.isArray(data.persons)).toBe(true);
    // Should contain the benched persons
    const ids = data.persons.map((p: any) => p.id);
    expect(ids).toContain(personId);
    expect(ids).toContain(personId2);
  });

  test("Unbenched a person", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId}/unbenched`,
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(personId);
    expect(data.isBenched).toBe(false);
  });

  test("Unbenched person with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid/unbenched",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 400);
  });

  test("Verify active persons no longer shows benched person", async () => {
    const res = await authenticatedApi("/api/persons", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    const ids = data.persons.map((p: any) => p.id);
    expect(ids).toContain(personId); // Unbenched, should appear
    expect(ids).not.toContain(personId2); // Still benched, should not appear
  });

  test("Unbenched nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000/unbenched",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 404);
  });

  test("List persons filtered by benched=true", async () => {
    const res = await authenticatedApi("/api/persons?benched=true", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.persons).toBeDefined();
    expect(Array.isArray(data.persons)).toBe(true);
    const ids = data.persons.map((p: any) => p.id);
    expect(ids).toContain(personId2); // personId2 is benched
    expect(ids).not.toContain(personId); // personId is not benched
  });

  test("List persons filtered by benched=false", async () => {
    const res = await authenticatedApi("/api/persons?benched=false", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.persons).toBeDefined();
    expect(Array.isArray(data.persons)).toBe(true);
    const ids = data.persons.map((p: any) => p.id);
    expect(ids).toContain(personId); // personId is not benched
    expect(ids).not.toContain(personId2); // personId2 is benched
  });

  test("Get persons stats", async () => {
    const res = await authenticatedApi("/api/persons/stats", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.active_count).toBeDefined();
    expect(data.benched_count).toBeDefined();
    expect(data.dates_count).toBeDefined();
    expect(typeof data.active_count).toBe("number");
    expect(typeof data.benched_count).toBe("number");
    expect(typeof data.dates_count).toBe("number");
  });

  // ========== Person Phone Update Tests ==========
  test("Update person's phone number with phone_number field", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId}/phone`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "555-1234",
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.phone_number).toBe("555-1234");
  });

  test("Update person's phone number with phoneNumber field (camelCase)", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId}/phone`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "555-5678",
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.phone_number).toBeDefined();
  });

  test("Update person's phone number with null value", async () => {
    const res = await authenticatedApi(
      `/api/persons/${personId}/phone`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: null,
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Update person phone with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid/phone",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "555-1234",
        }),
      }
    );
    await expectStatus(res, 400);
  });

  test("Update phone for nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000/phone",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: "555-1234",
        }),
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Dates CRUD Tests ==========
  test("Create a date with required fields", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        title: "Coffee date",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    dateId = data.id;
    expect(data.title).toBe("Coffee date");
    expect(data.id).toBeDefined();
  });

  test("Create a date with all optional fields", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        title: "Dinner date",
        location: "Downtown Restaurant",
        date_time: "2026-05-15T19:00:00Z",
        budget: "50-100",
        status: "confirmed",
        reminder_3_days: true,
        reminder_1_day: false,
        reminder_1_hour: true,
        notes: "Try the pasta",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.title).toBe("Dinner date");
    expect(data.id).toBeDefined();
  });

  test("Create date for review testing", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        title: "Review test date",
        status: "completed",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    reviewDateId = data.id;
    expect(data.id).toBeDefined();
  });

  test("Create date for deletion testing", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        title: "Date to delete",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    dateIdForDeletion = data.id;
    expect(data.id).toBeDefined();
  });

  test("Create date fails without required person_id", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Invalid date",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create date with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "invalid-uuid",
        title: "Invalid date",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create date with auto-generated title", async () => {
    const res = await authenticatedApi("/api/dates", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.title).toBe("Date");
  });

  test("List dates returns dates with person info", async () => {
    const res = await authenticatedApi("/api/dates", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.dates).toBeDefined();
    expect(Array.isArray(data.dates)).toBe(true);
    // Verify at least one date has person_id
    const datesWithPersonId = data.dates.filter((d: any) => d.person_id);
    expect(datesWithPersonId.length).toBeGreaterThan(0);
    const dateWithOurPerson = datesWithPersonId.find(
      (d: any) => d.person_id === personId
    );
    expect(dateWithOurPerson).toBeDefined();
  });

  test("List dates filtered by person_id", async () => {
    const res = await authenticatedApi(
      `/api/dates?person_id=${personId}`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.dates).toBeDefined();
    expect(Array.isArray(data.dates)).toBe(true);
    // All dates should be for this person
    const allForPerson = data.dates.every((d: any) => d.person_id === personId);
    expect(allForPerson).toBe(true);
  });

  test("List dates with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/dates?person_id=invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Get a date by ID", async () => {
    const res = await authenticatedApi(`/api/dates/${dateId}`, authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.date).toBeDefined();
    expect(data.date.id).toBe(dateId);
    expect(data.date.title).toBeDefined();
  });

  test("Get date with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(`/api/dates/invalid-uuid`, authToken);
    await expectStatus(res, 400);
  });

  test("Get nonexistent date returns 404", async () => {
    const res = await authenticatedApi(
      "/api/dates/00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Update a date with partial data", async () => {
    const res = await authenticatedApi(`/api/dates/${dateId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        notes: "Had a great time!",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(dateId);
  });

  test("Update a date with all fields", async () => {
    const res = await authenticatedApi(`/api/dates/${dateId}`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Coffee & dessert",
        location: "Cafe Downtown",
        date_time: "2026-05-20T15:00:00Z",
        budget: "30-50",
        status: "planned",
        reminder_3_days: false,
        reminder_1_day: true,
        reminder_1_hour: false,
        notes: "Bring umbrella",
      }),
    });
    await expectStatus(res, 200);
  });

  test("Update date with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(`/api/dates/invalid-uuid`, authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "planned" }),
    });
    await expectStatus(res, 400);
  });

  test("Update nonexistent date returns 404", async () => {
    const res = await authenticatedApi(
      "/api/dates/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Ghost date" }),
      }
    );
    await expectStatus(res, 404);
  });

  test("Add review to a completed date", async () => {
    const res = await authenticatedApi(
      `/api/dates/${reviewDateId}/review`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: 4,
          went_well: "Great conversation and good chemistry",
          went_poorly: "Noisy restaurant",
          want_another_date: true,
          status: "completed",
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(reviewDateId);
    expect(data.rating).toBe(4);
    expect(data.went_well).toBe("Great conversation and good chemistry");
    expect(data.went_poorly).toBe("Noisy restaurant");
    expect(data.want_another_date).toBe(true);
  });

  test("Add partial review with just rating", async () => {
    const res = await authenticatedApi(
      `/api/dates/${dateId}/review`,
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: 5,
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(dateId);
    expect(data.rating).toBe(5);
  });

  test("Review date with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/dates/invalid-uuid/review",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 }),
      }
    );
    await expectStatus(res, 400);
  });

  test("Review nonexistent date returns 404", async () => {
    const res = await authenticatedApi(
      "/api/dates/00000000-0000-0000-0000-000000000000/review",
      authToken,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 }),
      }
    );
    await expectStatus(res, 404);
  });

  test("Get dates pending review", async () => {
    const res = await authenticatedApi("/api/dates/pending-review", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Each item should have the expected structure
    if (data.length > 0) {
      const dateItem = data[0];
      expect(dateItem.id).toBeDefined();
      expect(dateItem.title).toBeDefined();
      expect(dateItem.status).toBeDefined();
      expect(dateItem.person).toBeDefined();
      expect(dateItem.person.id).toBeDefined();
      expect(dateItem.person.name).toBeDefined();
    }
  });

  test("Delete a date", async () => {
    const res = await authenticatedApi(
      `/api/dates/${dateIdForDeletion}`,
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Verify deleted date returns 404", async () => {
    const res = await authenticatedApi(
      `/api/dates/${dateIdForDeletion}`,
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Delete date with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/dates/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("Delete nonexistent date returns 404", async () => {
    const res = await authenticatedApi(
      "/api/dates/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Delete Person ==========
  test("Delete a person", async () => {
    const res = await authenticatedApi(`/api/persons/${personId2}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Delete person with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/persons/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("Get deleted person returns 404", async () => {
    const res = await authenticatedApi(`/api/persons/${personId2}`, authToken);
    await expectStatus(res, 404);
  });

  test("Delete nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/persons/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Analytics Tests ==========
  test("Get analytics for authenticated user", async () => {
    const res = await authenticatedApi("/api/analytics", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.total_active).toBeDefined();
    expect(data.total_benched).toBeDefined();
    expect(data.total_dates).toBeDefined();
    expect(typeof data.total_active).toBe("number");
    expect(typeof data.total_benched).toBe("number");
    expect(typeof data.total_dates).toBe("number");
  });

  // ========== AI & Date Plan Tests ==========
  test("Get AI date suggestions for a person", async () => {
    const res = await authenticatedApi("/api/date-plan", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        location: "San Francisco",
        budget: 75,
        date_time: "2026-05-20T18:00:00Z",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
    if (data.suggestions.length > 0) {
      const sugg = data.suggestions[0];
      expect(sugg.title).toBeDefined();
      expect(sugg.description).toBeDefined();
      expect(sugg.category).toBeDefined();
    }
  });

  test("Get date plan fails with nonexistent person", async () => {
    const res = await authenticatedApi("/api/date-plan", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "00000000-0000-0000-0000-000000000000",
        location: "San Francisco",
        budget: 75,
      }),
    });
    await expectStatus(res, 404);
  });

  test("Get date plan fails without required fields", async () => {
    const res = await authenticatedApi("/api/date-plan", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        location: "San Francisco",
        // missing budget
      }),
    });
    await expectStatus(res, 400);
  });

  // ========== Safety Check-in Tests ==========
  test("Create a safety check-in", async () => {
    const res = await authenticatedApi("/api/safety-checkins", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        date_location: "Downtown Coffee Shop",
        person_description: "Tall, brown hair, blue shirt",
        emergency_contacts: ["Mom: 555-1234", "Friend Jane: 555-5678"],
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.share_message).toBeDefined();
  });

  test("Create safety check-in without person_id", async () => {
    const res = await authenticatedApi("/api/safety-checkins", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date_location: "Park",
        person_description: "Test",
      }),
    });
    // Should succeed as person_id is optional in the schema
    await expectStatus(res, 201);
  });

  // ========== Chat Tests ==========
  test("Get chat messages (initially empty)", async () => {
    const res = await authenticatedApi("/api/chat", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
  });

  test("Send a message to dating coach", async () => {
    const res = await authenticatedApi("/api/chat", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "How do I start a conversation?",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
    expect(typeof data.reply).toBe("string");
  });

  test("Send another message", async () => {
    const res = await authenticatedApi("/api/chat", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Any tips for first dates?",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.reply).toBeDefined();
  });

  test("Get updated chat messages", async () => {
    const res = await authenticatedApi("/api/chat", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.messages).toBeDefined();
    expect(Array.isArray(data.messages)).toBe(true);
  });

  test("Get chat message history", async () => {
    const res = await authenticatedApi("/api/chat/history", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Each message should have the expected structure
    if (data.length > 0) {
      const msg = data[0];
      expect(msg.id).toBeDefined();
      expect(msg.role).toBeDefined();
      expect(msg.content).toBeDefined();
      expect(msg.createdAt).toBeDefined();
    }
  });

  test("Send message without content fails", async () => {
    const res = await authenticatedApi("/api/chat", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // ========== Photo Upload Tests ==========
  test("Upload a photo with both required fields", async () => {
    // Simple base64 encoded 1x1 transparent PNG
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await authenticatedApi("/api/upload-photo", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: base64Png,
        person_id: personId,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.photo_url).toBeDefined();
    expect(typeof data.photo_url).toBe("string");
  });

  test("Upload photo without base64 fails", async () => {
    const res = await authenticatedApi("/api/upload-photo", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
      }),
    });
    await expectStatus(res, 400);
  });

  test("Upload photo without person_id succeeds", async () => {
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await authenticatedApi("/api/upload-photo", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: base64Png,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.photo_url).toBeDefined();
    expect(data.photo_url).toContain("data:image/jpeg;base64,");
  });

  test("Upload photo with nonexistent person returns 404", async () => {
    const base64Png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const res = await authenticatedApi("/api/upload-photo", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: base64Png,
        person_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    await expectStatus(res, 404);
  });

  // ========== Interactions Tests ==========
  test("Create an interaction with required fields", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        type: "date",
        title: "Had coffee",
        occurred_at: "2026-04-20T14:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    interactionId = data.interaction.id;
    expect(data.interaction.id).toBeDefined();
    expect(data.interaction.personId).toBe(personId);
    expect(data.interaction.type).toBe("date");
    expect(data.interaction.title).toBe("Had coffee");
  });

  test("Create an interaction with notes", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        type: "text",
        title: "Sent message",
        notes: "Talked about weekend plans",
        occurred_at: "2026-04-21T10:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.interaction.notes).toBe("Talked about weekend plans");
  });

  test("Create interaction fails without required person_id", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "call",
        title: "Phone call",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create interaction fails without required type", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        title: "Some interaction",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create interaction fails without required title", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        type: "call",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create interaction without occurred_at uses current time", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        type: "call",
        title: "Phone call",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.interaction).toBeDefined();
    expect(data.interaction.occurredAt).toBeDefined();
    // Should be approximately now (within a few seconds)
    const occurredTime = new Date(data.interaction.occurredAt).getTime();
    const now = new Date().getTime();
    expect(Math.abs(now - occurredTime)).toBeLessThan(5000);
  });

  test("Create interaction with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "invalid-uuid",
        type: "call",
        title: "Phone call",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create interaction with nonexistent person returns 404", async () => {
    const res = await authenticatedApi("/api/interactions", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "00000000-0000-0000-0000-000000000000",
        type: "call",
        title: "Phone call",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 404);
  });

  test("List interactions for a person", async () => {
    const res = await authenticatedApi(
      `/api/interactions?person_id=${personId}`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.interactions).toBeDefined();
    expect(Array.isArray(data.interactions)).toBe(true);
    // Should contain interactions we created
    const titles = data.interactions.map((i: any) => i.title);
    expect(titles).toContain("Had coffee");
    expect(titles).toContain("Sent message");
  });

  test("Get interactions without person_id returns 400", async () => {
    const res = await authenticatedApi("/api/interactions", authToken);
    await expectStatus(res, 400);
  });

  test("Get interactions with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/interactions?person_id=invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Delete an interaction", async () => {
    const res = await authenticatedApi(
      `/api/interactions/${interactionId}`,
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 204);
  });

  test("Delete interaction with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/interactions/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("Delete nonexistent interaction returns 404", async () => {
    const res = await authenticatedApi(
      "/api/interactions/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Notes Tests ==========
  test("Create a note for a person", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        content: "She loves hiking and coffee",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    noteId = data.note.id;
    expect(data.note.id).toBeDefined();
    expect(data.note.personId).toBe(personId);
    expect(data.note.content).toBe("She loves hiking and coffee");
    expect(data.note.createdAt).toBeDefined();
  });

  test("Create a note with custom created_at", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        content: "Follow up next week",
        created_at: "2026-04-15T10:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.note.id).toBeDefined();
    expect(data.note.content).toBe("Follow up next week");
  });

  test("Create note fails without required person_id", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Missing person_id",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create note fails without required content", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create note with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "invalid-uuid",
        content: "Invalid person",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create note for nonexistent person returns 404", async () => {
    const res = await authenticatedApi("/api/notes", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "00000000-0000-0000-0000-000000000000",
        content: "This person doesn't exist",
      }),
    });
    await expectStatus(res, 404);
  });

  test("List notes for a person", async () => {
    const res = await authenticatedApi(
      `/api/notes?person_id=${personId}`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data.notes)).toBe(true);
    // Should contain notes we created
    if (data.notes.length > 0) {
      const note = data.notes[0];
      expect(note.id).toBeDefined();
      expect(note.personId).toBeDefined();
      expect(note.content).toBeDefined();
      expect(note.createdAt).toBeDefined();
    }
  });

  test("Get notes without person_id returns 400", async () => {
    const res = await authenticatedApi("/api/notes", authToken);
    await expectStatus(res, 400);
  });

  test("List notes with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi(
      `/api/notes?person_id=invalid-uuid`,
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Get notes for nonexistent person returns 404", async () => {
    const res = await authenticatedApi(
      "/api/notes?person_id=00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Delete a note", async () => {
    const res = await authenticatedApi(`/api/notes/${noteId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 204);
  });

  test("Delete note with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/notes/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("Delete nonexistent note returns 404", async () => {
    const res = await authenticatedApi(
      "/api/notes/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Reminders Tests ==========
  test("Create a reminder for a person", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        text: "Call Alice next week",
        remind_at: "2026-04-29T10:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    reminderId = data.id;
    expect(data.id).toBeDefined();
    expect(data.personId).toBe(personId);
    expect(data.text).toBe("Call Alice next week");
    expect(data.remindAt).toBeDefined();
    expect(data.createdAt).toBeDefined();
  });

  test("Create another reminder", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        text: "Check in on weekend plans",
        remind_at: "2026-04-25T18:00:00Z",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.text).toBe("Check in on weekend plans");
  });

  test("Create reminder fails without required person_id", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "Missing person_id",
        remind_at: "2026-04-25T10:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create reminder fails without required text", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        remind_at: "2026-04-25T10:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create reminder fails without required remind_at", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        text: "Missing remind_at",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Create reminder with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi("/api/reminders", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "invalid-uuid",
        text: "Invalid person",
        remind_at: "2026-04-25T10:00:00Z",
      }),
    });
    await expectStatus(res, 400);
  });

  test("List reminders for a person", async () => {
    const res = await authenticatedApi(
      `/api/reminders?person_id=${personId}`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    // Should contain reminders we created
    if (data.length > 0) {
      const reminder = data[0];
      expect(reminder.id).toBeDefined();
      expect(reminder.personId).toBeDefined();
      expect(reminder.text).toBeDefined();
      expect(reminder.remindAt).toBeDefined();
      expect(reminder.createdAt).toBeDefined();
    }
  });

  test("Get reminders without person_id returns 400", async () => {
    const res = await authenticatedApi("/api/reminders", authToken);
    await expectStatus(res, 400);
  });

  test("List reminders with invalid person_id format returns 400", async () => {
    const res = await authenticatedApi(
      `/api/reminders?person_id=invalid-uuid`,
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Delete a reminder", async () => {
    const res = await authenticatedApi(`/api/reminders/${reminderId}`, authToken, {
      method: "DELETE",
    });
    await expectStatus(res, 204);
  });

  test("Delete reminder with invalid ID format returns 400", async () => {
    const res = await authenticatedApi(
      "/api/reminders/invalid-uuid",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 400);
  });

  test("Delete nonexistent reminder returns 404", async () => {
    const res = await authenticatedApi(
      "/api/reminders/00000000-0000-0000-0000-000000000000",
      authToken,
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 404);
  });

  // ========== Reminders Feed Tests ==========
  test("Get reminders feed with upcoming dates and nudges", async () => {
    const res = await authenticatedApi("/api/reminders/feed", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.upcoming_dates).toBeDefined();
    expect(Array.isArray(data.upcoming_dates)).toBe(true);
    expect(data.nudges).toBeDefined();
    expect(Array.isArray(data.nudges)).toBe(true);
  });

  // ========== Places Autocomplete Tests ==========
  test("Get place autocomplete suggestions with input", async () => {
    const res = await authenticatedApi(
      "/api/places/autocomplete?input=New%20York",
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(Array.isArray(data.predictions)).toBe(true);
  });

  test("Get place autocomplete with input and sessiontoken", async () => {
    const res = await authenticatedApi(
      "/api/places/autocomplete?input=San%20Francisco&sessiontoken=test-session-123",
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.predictions).toBeDefined();
    expect(Array.isArray(data.predictions)).toBe(true);
  });

  test("Get place autocomplete without input returns 400", async () => {
    const res = await authenticatedApi(
      "/api/places/autocomplete",
      authToken
    );
    await expectStatus(res, 400);
  });

  // ========== Profile Tests ==========
  test("Get authenticated user profile", async () => {
    const res = await authenticatedApi("/api/profile", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.userId).toBeDefined();
  });

  test("Update user profile with partial data", async () => {
    const res = await authenticatedApi("/api/profile", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        age: 30,
        location: "San Francisco",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id !== undefined || data.userId !== undefined).toBe(true);
  });

  test("Update user profile with all fields", async () => {
    const res = await authenticatedApi("/api/profile", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: "Updated Name",
        photo_url: "https://example.com/photo.jpg",
        age: 31,
        birthday: "1995-05-15",
        zodiac: "taurus",
        location: "New York",
        occupation: "Software Engineer",
        bio: "Love hiking and coffee",
        favorite_foods: ["pizza", "sushi"],
        hobbies: ["hiking", "reading"],
        green_flags: ["kind", "funny"],
        red_flags: ["dishonest"],
        attractiveness_self: 7,
        communication_self: 8,
        instagram: "@myprofile",
        tiktok: "@mytiktok",
        twitter_x: "@mytwitter",
        phone_number: "555-1234",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id !== undefined || data.userId !== undefined).toBe(true);
  });

  // ========== Unauthenticated Request Tests ==========
  test("Unauthenticated GET /api/persons returns 401", async () => {
    const res = await api("/api/persons");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/persons returns 401", async () => {
    const res = await api("/api/persons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", location: "Test" }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated PATCH /api/persons/{id}/phone returns 401", async () => {
    const res = await api(
      "/api/persons/00000000-0000-0000-0000-000000000000/phone",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: "555-1234" }),
      }
    );
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/persons/stats returns 401", async () => {
    const res = await api("/api/persons/stats");
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/dates returns 401", async () => {
    const res = await api("/api/dates");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/dates returns 401", async () => {
    const res = await api("/api/dates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "00000000-0000-0000-0000-000000000000",
        title: "Test date",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/dates/{id} returns 401", async () => {
    const res = await api("/api/dates/00000000-0000-0000-0000-000000000000");
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/analytics returns 401", async () => {
    const res = await api("/api/analytics");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/date-plan returns 401", async () => {
    const res = await api("/api/date-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: "00000000-0000-0000-0000-000000000000",
        budget: 100,
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/chat returns 401", async () => {
    const res = await api("/api/chat");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/chat returns 401", async () => {
    const res = await api("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Test" }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/chat/history returns 401", async () => {
    const res = await api("/api/chat/history");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/upload-photo returns 401", async () => {
    const res = await api("/api/upload-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base64: "test",
        person_id: "00000000-0000-0000-0000-000000000000",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/interactions returns 401", async () => {
    const res = await api(`/api/interactions?person_id=${personId}`);
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/interactions returns 401", async () => {
    const res = await api("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        type: "call",
        title: "Test",
        occurred_at: "2026-04-22T15:00:00Z",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated DELETE /api/interactions/{id} returns 401", async () => {
    const res = await api(
      "/api/interactions/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/notes returns 401", async () => {
    const res = await api(`/api/notes?person_id=${personId}`);
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/notes returns 401", async () => {
    const res = await api("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        content: "Test note",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated DELETE /api/notes/{id} returns 401", async () => {
    const res = await api(
      "/api/notes/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/reminders returns 401", async () => {
    const res = await api(`/api/reminders?person_id=${personId}`);
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/reminders returns 401", async () => {
    const res = await api("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        text: "Test reminder",
        remind_at: "2026-04-25T10:00:00Z",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated DELETE /api/reminders/{id} returns 401", async () => {
    const res = await api(
      "/api/reminders/00000000-0000-0000-0000-000000000000",
      {
        method: "DELETE",
      }
    );
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/reminders/feed returns 401", async () => {
    const res = await api("/api/reminders/feed");
    await expectStatus(res, 401);
  });

  test("Unauthenticated POST /api/safety-checkins returns 401", async () => {
    const res = await api("/api/safety-checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        person_id: personId,
        date_location: "Park",
        person_description: "Test",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/places/autocomplete returns 401", async () => {
    const res = await api("/api/places/autocomplete?input=test");
    await expectStatus(res, 401);
  });

  test("Unauthenticated GET /api/profile returns 401", async () => {
    const res = await api("/api/profile");
    await expectStatus(res, 401);
  });

  test("Unauthenticated PUT /api/profile returns 401", async () => {
    const res = await api("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: "Test" }),
    });
    await expectStatus(res, 401);
  });
});
